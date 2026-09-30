export interface WildlifePose { x: number; z: number; yaw: number; walking: boolean; running?: boolean }
export interface WildlifeVisitor { x: number; z: number; moving: boolean; sneaking: boolean; running: boolean }
export const movementSpeed = (sneaking: boolean, running: boolean) => sneaking ? 1.5 : running ? 8 : 4.5;
export const wildlifeNoiseRadius = (visitor: WildlifeVisitor) => visitor.sneaking ? 6 : visitor.running ? 28 : 18;
export type DeerMood = 'calm' | 'fleeing' | 'startled' | 'returning';
type Journey = { from: WildlifePose; x: number; z: number; start: number; duration: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Only live play advances awareness. Rendering shutter samples reads this state
// without making the deer react again or changing its recovery timer.
export class DeerAwareness {
  private escape: Journey | null = null;
  private returning: { from: WildlifePose; start: number } | null = null;
  private quietSince: number | null = null;

  mood(time: number): DeerMood {
    if (!this.escape) return 'calm';
    if (this.returning) return time < this.returning.start + 12 ? 'returning' : 'calm';
    return time < this.escape.start + this.escape.duration ? 'fleeing' : 'startled';
  }
  pose(time: number, routine: WildlifePose): WildlifePose {
    if (!this.escape) return routine;
    const trip = this.returning ? { ...this.returning, x: routine.x, z: routine.z, duration: 12 } : this.escape;
    const t = Math.max(0, Math.min(1, (time - trip.start) / trip.duration));
    if (this.returning && t === 1) return routine;
    return { x: lerp(trip.from.x, trip.x, t), z: lerp(trip.from.z, trip.z, t),
      yaw: Math.atan2(trip.x - trip.from.x, trip.z - trip.from.z), walking: t < 1, running: !this.returning && t < 1 };
  }
  advance(time: number, routine: WildlifePose, visitor: WildlifeVisitor, canWalk: (x: number, z: number) => boolean): boolean {
    if (this.returning && this.mood(time) === 'calm') { this.escape = null; this.returning = null; this.quietSince = null; }
    const current = this.pose(time, routine);
    const distance = Math.hypot(current.x - visitor.x, current.z - visitor.z);
    const threat = distance < (visitor.sneaking ? 4 : 7) || (visitor.moving && distance < wildlifeNoiseRadius(visitor));
    if (this.mood(time) === 'fleeing') return false;
    if (threat) {
      const away = Math.atan2(current.x - visitor.x, current.z - visitor.z);
      let destination = { x: current.x, z: current.z }, best = -Infinity;
      for (const turn of [0, -0.6, 0.6, -1.2, 1.2, -2, 2]) {
        const angle = away + turn;
        let x = current.x, z = current.z;
        for (let step = 0.5; step <= 24; step += 0.5) {
          const nx = current.x + Math.sin(angle) * step, nz = current.z + Math.cos(angle) * step;
          if (!canWalk(nx, nz)) break;
          x = nx; z = nz;
        }
        const score = Math.hypot(x - visitor.x, z - visitor.z);
        if (score > best) { destination = { x, z }; best = score; }
      }
      this.escape = { from: current, ...destination, start: time, duration: Math.max(0.5, Math.hypot(destination.x - current.x, destination.z - current.z) / 7) };
      this.returning = null; this.quietSince = null; return true;
    }
    if (!this.escape || this.returning) return false;
    if (distance >= 18 && (!visitor.moving || visitor.sneaking)) {
      this.quietSince ??= time;
      if (time - this.quietSince >= 8) {
        // Return only along a dry, unobstructed route.
        const steps = Math.ceil(Math.hypot(routine.x - current.x, routine.z - current.z) * 2);
        let clear = true;
        for (let i = 1; i <= steps; i++) if (!canWalk(lerp(current.x, routine.x, i / steps), lerp(current.z, routine.z, i / steps))) { clear = false; break; }
        if (clear) this.returning = { from: current, start: time };
      }
    } else this.quietSince = null;
    return false;
  }
}

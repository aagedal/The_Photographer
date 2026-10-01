import type { WildlifePose, WildlifeVisitor } from './wildlife.ts';

export const BEAR_SAFE_DISTANCE = 20;
export const BEAR_MAX_BITES = 4;
export type BearMood = 'calm' | 'warning' | 'charging' | 'returning';
export const bearRoutine = (time: number): WildlifePose => ({ x: -88 + Math.sin(time * 0.12) * 1.2, z: -91 + Math.cos(time * 0.12) * 0.8, yaw: 3.35 + Math.sin(time * 0.12) * 0.12, walking: false });
export const normalizeBearBites = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < BEAR_MAX_BITES ? value : 0;

// Live play alone advances aggression and damage. Shutter samples only read pose().
export class BearEncounter {
  mood: BearMood = 'calm';
  bites: number;
  lastBite = -Infinity;
  private position: WildlifePose | null = null;
  private warningSince = 0;
  private safeSince: number | null = null;
  constructor(bites: unknown = 0) { this.bites = normalizeBearBites(bites); }

  pose(time: number): WildlifePose { return this.position ? { ...this.position } : bearRoutine(time); }
  reset() { this.mood = 'calm'; this.position = null; this.bites = 0; this.lastBite = -Infinity; this.safeSince = null; }

  advance(time: number, dt: number, visitor: WildlifeVisitor, canWalk: (x: number, z: number) => boolean) {
    const event = { warning: false, bite: false, knockedOut: false, recovered: false };
    const pose = this.pose(time), routine = bearRoutine(time);
    const distance = Math.hypot(visitor.x - pose.x, visitor.z - pose.z);
    if (this.mood === 'calm' && distance < BEAR_SAFE_DISTANCE) {
      this.mood = 'warning'; this.warningSince = time; this.position = pose; event.warning = true;
    }
    if (this.mood === 'warning') {
      if (distance >= BEAR_SAFE_DISTANCE) { this.mood = 'calm'; this.position = null; }
      else if (distance < 10 || time - this.warningSince >= 2.5) this.mood = 'charging';
    }
    if (this.mood === 'charging' && (distance > 26 || Math.hypot(pose.x + 88, pose.z + 91) > 32)) this.mood = 'returning';
    if (this.mood === 'charging' || this.mood === 'returning') {
      const target = this.mood === 'charging' ? visitor : routine;
      const dx = target.x - pose.x, dz = target.z - pose.z, length = Math.hypot(dx, dz);
      const step = Math.min(length, Math.max(0, Math.min(dt, 0.05)) * (this.mood === 'charging' ? 6.3 : 2));
      if (length > 0.001) {
        pose.yaw = Math.atan2(dz, -dx); // Model faces local -X.
        const nx = pose.x + dx / length * step, nz = pose.z + dz / length * step;
        if (canWalk(nx, pose.z)) pose.x = nx;
        if (canWalk(pose.x, nz)) pose.z = nz;
      }
      pose.walking = step > 0.001; this.position = pose;
      if (this.mood === 'returning' && length < 0.2) { this.mood = 'calm'; this.position = null; }
      const contactDistance = Math.hypot(visitor.x - pose.x, visitor.z - pose.z);
      const contactSteps = Math.max(1, Math.ceil(contactDistance / 0.25));
      let contactClear = contactDistance < 3;
      if (contactClear) for (let i = 1; i <= contactSteps; i++) {
        if (!canWalk(pose.x + (visitor.x-pose.x) * i/contactSteps, pose.z + (visitor.z-pose.z) * i/contactSteps)) { contactClear = false; break; }
      }
      if (this.mood === 'charging' && contactClear && time - this.lastBite >= 1.5) {
        this.lastBite = time; this.bites++; event.bite = true; event.knockedOut = this.bites >= BEAR_MAX_BITES;
      }
    } else if (this.mood === 'warning') {
      pose.yaw = Math.atan2(visitor.z - pose.z, pose.x - visitor.x); this.position = pose;
    }
    if (this.bites && distance >= 26 && this.mood !== 'charging') {
      this.safeSince ??= time;
      if (time - this.safeSince >= 20) { this.bites = 0; this.safeSince = null; event.recovered = true; }
    } else this.safeSince = null;
    return event;
  }
}

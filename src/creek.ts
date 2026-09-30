// Shared channel coordinates keep the visible river, basin and movement aligned.
export const creekPath = [
  { x: -24, z: -10.2, width: 3.5 }, { x: -24, z: -7.6, width: 6 },
  { x: -24.2, z: -4, width: 3.8 }, { x: -23.5, z: -0.8, width: 3.4 },
  { x: -20.8, z: 1.1, width: 4.4 }, { x: -18.2, z: 1.4, width: 4.8 },
] as const;
export function creekDistance(x: number, z: number) {
  let nearest = Infinity;
  for (let i = 1; i < creekPath.length; i++) {
    const a = creekPath[i - 1], b = creekPath[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const radius = (a.width + (b.width - a.width) * t) / 2;
    nearest = Math.min(nearest, Math.hypot(x - a.x - dx * t, z - a.z - dz * t) / radius);
  }
  return nearest;
}
const lengths = creekPath.slice(1).map((point, i) => Math.hypot(point.x - creekPath[i].x, point.z - creekPath[i].z));
const total = lengths.reduce((sum, length) => sum + length, 0);
export function creekPoint(progress: number) {
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = Math.min(1, remaining / lengths[i]), a = creekPath[i], b = creekPath[i + 1];
      const dx = (b.x - a.x) / lengths[i], dz = (b.z - a.z) / lengths[i];
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, width: a.width + (b.width - a.width) * t, dx, dz };
    }
    remaining -= lengths[i];
  }
  throw new Error('Creek path is empty');
}

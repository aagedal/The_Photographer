import { creekDistance } from './creek.ts';

export const WORLD_HALF = 130;
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Keep the original town level; rolling foothills begin beyond its streets.
export function terrainHeight(x: number, z: number) {
  const edge = smooth(34, 64, Math.max(Math.abs(x), Math.abs(z)));
  const ridge = 19 * Math.exp(-(((x + 53) / 35) ** 2) - ((z + 76) / 42) ** 2);
  const meadow = 7 * Math.exp(-(((x + 75) / 40) ** 2) - ((z - 65) / 37) ** 2);
  const east = 9 * Math.exp(-(((x - 100) / 36) ** 2) - ((z - 28) / 42) ** 2);
  const rolling = 2.2 + Math.sin(x * 0.055) * Math.cos(z * 0.045) * 1.8;
  // A level shelf holds the wetland; avoid a pond sitting on a slope.
  const wetland = 1 - smooth(17, 31, Math.hypot((x - 76) * 0.85, z + 54));
  const height = edge * (ridge + meadow + east + rolling) * (1 - wetland) + 1.2 * edge * wetland;
  const lakeInset = Math.min(14 - Math.abs(x + 7), 11.5 - Math.abs(z + 3));
  const jetty = Math.abs(x) < 1.8 && z > 3.5;
  const lakeDepth = jetty ? 0 : 1.65 * smooth(0, 2.5, lakeInset);
  const pondRadius = Math.hypot((x - 76) / 14, (z + 54) / 11);
  const pondDepth = 1.25 * (1 - smooth(0.78, 1, pondRadius));
  const channelDepth = 0.95 * (1 - smooth(0.7, 1.3, creekDistance(x, z)));
  return height - Math.max(lakeDepth, channelDepth) - pondDepth;
}
export const trails: [number, number][][] = [
  [[-4, -25], [-30, -37], [-46, -51], [-53, -70], [-67, -88], [-89, -98]],
  [[43, 16], [55, 3], [57, -18], [63, -32], [59, -53], [60, -69], [86, -75], [105, -87]],
  [[-35, 25], [-48, 39], [-64, 58], [-82, 72], [-99, 49], [-78, 19], [-48, 15]],
];
export function distanceToTrail(x: number, z: number) {
  let distance = Infinity;
  for (const trail of trails) for (let i = 1; i < trail.length; i++) {
    const [ax, az] = trail[i - 1], [bx, bz] = trail[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return distance;
}

import { creekDistance } from './creek.ts';

export const WORLD_HALF = 260;
export const coastline = (x: number) => 98 + Math.sin(x * 0.045) * 3 + Math.sin(x * 0.1) * 1.5;
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
  const townShelf = smooth(-18, -12, x) * (1 - smooth(54, 64, x)) * smooth(29, 35, z) * (1 - smooth(76, 86, z));
  const height = (1 - townShelf) * (edge * (ridge + meadow + east + rolling) * (1 - wetland) + 1.2 * edge * wetland);
  const lakeInset = Math.min(14 - Math.abs(x + 7), 11.5 - Math.abs(z + 3));
  const jetty = Math.abs(x) < 1.8 && z > 3.5;
  const lakeDepth = jetty ? 0 : 1.65 * smooth(0, 2.5, lakeInset);
  const pondRadius = Math.hypot((x - 76) / 14, (z + 54) / 11);
  const pondDepth = 1.25 * (1 - smooth(0.78, 1, pondRadius));
  const channelDepth = 0.95 * (1 - smooth(0.7, 1.3, creekDistance(x, z)));
  const chapelShelf = (1 - smooth(7, 13, Math.abs(x + 43))) * (1 - smooth(8, 14, Math.abs(z - 16)));
  // New outer country rises gently, leaving the familiar town and original trails intact.
  const outer = smooth(112, 145, Math.max(Math.abs(x), Math.abs(z)));
  const westernHead = 14 * Math.exp(-(((x + 184) / 42) ** 2) - ((z - 62) / 43) ** 2);
  const northernHeights = 30 * Math.exp(-(((x + 143) / 65) ** 2) - ((z + 183) / 68) ** 2);
  const easternHill = 18 * Math.exp(-(((x - 181) / 48) ** 2) - ((z - 33) / 48) ** 2);
  const outerRolling = 3 + Math.sin(x * 0.025) * Math.cos(z * 0.022) * 2;
  const inland = height * (1 - chapelShelf) - Math.max(lakeDepth, channelDepth) - pondDepth + outer * (westernHead + northernHeights + easternHill + outerRolling);
  const shore = coastline(x), coastal = smooth(82 - outer * 26, shore - 8, z);
  const beach = z <= shore ? 1.6 * (1 - smooth(shore - 9, shore, z)) : -2 * smooth(shore, shore + 10, z);
  const harborShelf = (1 - smooth(6, 11, Math.abs(x - 45))) * (1 - smooth(5, 9, Math.abs(z - 84)));
  return (inland * (1 - coastal) + beach * coastal) * (1 - harborShelf) + 0.8 * harborShelf;
}
export const trails: [number, number][][] = [
  [[-4, -25], [-30, -37], [-46, -51], [-53, -70], [-67, -88], [-89, -98]],
  [[43, 16], [55, 3], [57, -18], [63, -32], [59, -53], [60, -69], [86, -75], [105, -87]],
  [[-35, 25], [-48, 39], [-64, 58], [-82, 72], [-99, 49], [-78, 19], [-48, 15]],
  [[-82, 72], [-114, 76], [-135, 81], [-156, 79], [-177, 78]],
  [[-89, -98], [-106, -119], [-111, -146], [-127, -160], [-143, -170]],
  [[105, -87], [129, -86], [145, -73], [160, -72], [160, -99]],
  [[43, 16], [76, 20], [105, 41], [138, 54], [148, 66], [165, 58], [181, 43]],
  [[105, 41], [119, 12], [135, -27], [140, -62], [129, -86]],
  [[48, 61], [48, 76], [45, 81]],
  [[45, 81], [38, 81], [38, 86], [24, 88], [8, 88]],
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

// Shared by the cinematography and coastal scenery: keep a real shipping channel clear.
export const ARRIVAL_DURATION = 34;
export const boatBerth = [5, 109] as const;
export function arrivalPose(seconds: number) {
  const t = Math.max(0, Math.min(1, seconds / ARRIVAL_DURATION));
  // Slow down over the last quarter of the journey without stopping mid-channel.
  const u = 1 - (1 - t) ** 1.5, v = 1 - u;
  const x = v ** 3 * -212 + 3 * v * v * u * -135 + 3 * v * u * u * 5 + u ** 3 * boatBerth[0];
  const z = v ** 3 * 158 + 3 * v * v * u * 145 + 3 * v * u * u * 145 + u ** 3 * boatBerth[1];
  const dx = 3 * v * v * 77 + 6 * v * u * 140;
  const dz = 3 * v * v * -13 + 3 * u * u * -36;
  return { x, z, yaw: Math.atan2(-dx, -dz), progress: t };
}
export function distanceToArrivalRoute(x: number, z: number) {
  let distance = Infinity;
  for (let i = 0; i <= 240; i++) {
    const p = arrivalPose(i / 240 * ARRIVAL_DURATION);
    distance = Math.min(distance, Math.hypot(x - p.x, z - p.z));
  }
  return distance;
}

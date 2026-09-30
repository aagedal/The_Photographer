// Thin-lens circle of confusion, in output pixels. Scene distances are metres;
// focal length and the full-frame sensor height are millimetres.
export function blurScale(focalLength: number, aperture: number, focusDistance: number, height: number, sensorHeight = 24): number {
  const focal = focalLength / 1000;
  const focus = Math.max(focal + 0.01, focusDistance);
  return focal * focal / (aperture * (focus - focal)) * 1000 / sensorHeight * height / 2;
}

export function blurRadius(depth: number, focalLength: number, aperture: number, focusDistance: number, height = 600): number {
  const focus = Math.max(focalLength / 1000 + 0.01, focusDistance);
  return blurScale(focalLength, aperture, focus, height) * Math.abs(1 - focus / Math.max(depth, 0.01));
}

import type { CameraSettings } from './photography.ts';

// Small breathing/hand movement, independent of shutter speed. Scale down the
// angle at long focal lengths so the view stays usable for precise aiming.
export function handheldWobble(time: number, focalLength: number, tripodProgress: number, reducedMotion: boolean): { yaw: number; pitch: number } {
  if (reducedMotion || tripodProgress >= 1) return { yaw: 0, pitch: 0 };
  const progress = Math.max(0, Math.min(1, tripodProgress));
  const strength = (1 - progress * progress * (3 - 2 * progress)) * Math.min(1, 35 / focalLength);
  return {
    yaw: strength * 0.0016 * (Math.sin(time * 1.7) * 0.75 + Math.sin(time * 3.3 + 1) * 0.25),
    pitch: strength * 0.0012 * (Math.sin(time * 1.3 + 2) * 0.8 + Math.sin(time * 2.9) * 0.2),
  };
}

// Midpoint samples span the actual shutter interval. Odd counts include the
// capture instant, where the brief flash pulse and panning reference belong.
export function exposureSamples(shutter: number): number[] {
  const count = shutter <= 1 / 500 ? 1 : shutter <= 1 / 60 ? 9 : shutter <= 1 / 8 ? 17 : 33;
  return Array.from({ length: count }, (_, i) => ((i + 0.5) / count - 0.5) * shutter);
}

export function cameraShake(s: CameraSettings, offset: number, time: number): { yaw: number; pitch: number } {
  const safeShutter = 1 / Math.max(30, s.focalLength ?? 35);
  if (s.tripod || s.shutter <= safeShutter) return { yaw: 0, pitch: 0 };
  const amplitude = Math.min(0.018, 0.002 * Math.sqrt(s.shutter / safeShutter - 1)) * (s.panning ? 0.35 : 1);
  // Angular motion naturally becomes more visible at longer focal lengths.
  const drift = (frequency: number, phase: number) => Math.sin((time + offset) * frequency + phase) - Math.sin(time * frequency + phase);
  return { yaw: amplitude * (drift(7, 0) + drift(17, 1) * 0.3), pitch: amplitude * (drift(9, 2) + drift(13, 0) * 0.3) };
}

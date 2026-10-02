import { apertureValues, isoValues, shutterValues } from './controls.ts';
import type { CameraSettings } from './photography.ts';

export const framingGrids = ['thirds', 'center', 'none'] as const;
export type FramingGrid = typeof framingGrids[number];
export interface PlayerPreferences {
  grid: FramingGrid;
  sensitivity: number;
  quality: 'balanced' | 'performance';
}
export function normalizePreferences(raw?: Partial<PlayerPreferences> | null): PlayerPreferences {
  return {
    grid: framingGrids.includes(raw?.grid as FramingGrid) ? raw!.grid! : 'thirds',
    sensitivity: typeof raw?.sensitivity === 'number' && Number.isFinite(raw.sensitivity) ? Math.max(0.5, Math.min(1.5, raw.sensitivity)) : 1,
    quality: raw?.quality === 'performance' ? 'performance' : 'balanced',
  };
}

// Restore exposure controls independently. Equipment ownership and tripod setup
// remain governed by the game, rather than trusting fields from a saved snapshot.
export function restoreExposure(raw: Partial<CameraSettings> | undefined, fallback: CameraSettings): CameraSettings {
  return {
    ...fallback,
    shutter: shutterValues.includes(raw?.shutter as number) ? raw!.shutter! : fallback.shutter,
    aperture: apertureValues.includes(raw?.aperture as number) ? raw!.aperture! : fallback.aperture,
    iso: isoValues.includes(raw?.iso as number) ? raw!.iso! : fallback.iso,
    panning: typeof raw?.panning === 'boolean' ? raw.panning : fallback.panning,
  };
}
export function normalizeLook(raw?: { yaw: number; pitch: number }): { yaw: number; pitch: number } | undefined {
  if (!Number.isFinite(raw?.yaw) || !Number.isFinite(raw?.pitch)) return;
  const yaw = Math.atan2(Math.sin(raw!.yaw), Math.cos(raw!.yaw));
  return { yaw, pitch: Math.max(-1.3, Math.min(1.3, raw!.pitch)) };
}

// Losing focus can suspend requestAnimationFrame entirely. Reset on lifecycle
// events so returning never includes time spent away in the next simulation step.
export class FrameClock {
  private previous = 0;
  private wasActive = false;
  reset(now: number) { this.previous = now; this.wasActive = false; }
  tick(now: number, active: boolean) {
    const seconds = active && this.wasActive ? Math.max(0, (now - this.previous) / 1000) : 0;
    this.previous = now;
    this.wasActive = active;
    return seconds;
  }
}

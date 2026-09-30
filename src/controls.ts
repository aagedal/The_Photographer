import type { CameraSettings } from './photography.ts';

export const shutterValues = [1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 0.25, 0.5, 1, 5, 10, 15, 30, 60];
export const apertureValues = [1.8, 2.8, 4, 5.6, 8, 11, 16, 22];
export const isoValues = [100, 200, 400, 800, 1600, 3200, 6400];
export type CameraControl = 'shutter' | 'aperture' | 'iso';
const bindings: Record<string, { control: CameraControl; direction: number; values: number[] }> = {
  '1': { control: 'shutter', direction: 1, values: shutterValues },
  '2': { control: 'shutter', direction: -1, values: shutterValues },
  '3': { control: 'aperture', direction: -1, values: apertureValues },
  '4': { control: 'aperture', direction: 1, values: apertureValues },
  '5': { control: 'iso', direction: -1, values: isoValues },
  '6': { control: 'iso', direction: 1, values: isoValues },
};
export function adjustCameraSetting(settings: CameraSettings, key: string): { settings: CameraSettings; control: CameraControl } | null {
  const binding = bindings[key];
  if (!binding) return null;
  const { control, direction, values } = binding;
  const nearest = values.reduce((best, value, index) => Math.abs(value - settings[control]) < Math.abs(values[best] - settings[control]) ? index : best, 0);
  const index = Math.max(0, Math.min(values.length - 1, nearest + direction));
  return { settings: { ...settings, [control]: values[index] }, control };
}

export class TripodState {
  progress = 0;
  target = 0;
  get deployed() { return this.target === 1 && this.progress === 1; }
  get transitioning() { return this.progress !== this.target; }
  get movementLocked() { return this.target === 1 || this.progress > 0; }
  request(deployed: boolean, immediate = false) {
    this.target = deployed ? 1 : 0;
    if (immediate) this.progress = this.target;
  }
  toggle(immediate = false) { this.request(this.target === 0, immediate); }
  update(seconds: number) {
    const step = Math.max(0, seconds) / (this.target === 1 ? 0.42 : 0.28);
    this.progress = this.target === 1 ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step);
  }
}

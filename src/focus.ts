import { blurRadius } from './optics.ts';

export type FocusMode = 'auto' | 'manual';
export const MIN_FOCUS_DISTANCE = 0.7;
export const INFINITY_FOCUS = 1e6;
const FAR_FOCUS_DISTANCE = 1000;

export function normalizeFocusDistance(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(MIN_FOCUS_DISTANCE, Math.min(INFINITY_FOCUS, value)) : 10;
}

// A logarithmic focus ring gives close subjects room for fine adjustments.
// The last position explicitly selects infinity rather than an arbitrary far plane.
export function focusDistanceAt(position: number): number {
  const p = Number.isFinite(position) ? Math.max(0, Math.min(100, position)) : 50;
  return p === 100 ? INFINITY_FOCUS : MIN_FOCUS_DISTANCE * (FAR_FOCUS_DISTANCE / MIN_FOCUS_DISTANCE) ** (p / 99);
}

export function focusPosition(distance: number): number {
  const d = normalizeFocusDistance(distance);
  return d >= INFINITY_FOCUS ? 100 : Math.min(99.9, 99 * Math.log(d / MIN_FOCUS_DISTANCE) / Math.log(FAR_FOCUS_DISTANCE / MIN_FOCUS_DISTANCE));
}

export function focusLabel(distance: number): string {
  return distance >= 1e5 ? '∞' : `${distance < 10 ? distance.toFixed(2) : distance.toFixed(1)} m`;
}

export class FocusState {
  mode: FocusMode;
  distance: number;
  constructor(saved?: { mode?: unknown; distance?: unknown }) {
    this.mode = saved?.mode === 'manual' ? 'manual' : 'auto';
    this.distance = normalizeFocusDistance(saved?.distance);
  }
  acquire(distance: number) { this.distance = normalizeFocusDistance(distance); }
  toggle(autoDistance: number) {
    this.acquire(autoDistance);
    this.mode = this.mode === 'auto' ? 'manual' : 'auto';
  }
  adjust(steps: number) {
    this.mode = 'manual';
    this.distance = focusDistanceAt(focusPosition(this.distance) + steps);
  }
}

// Match the saved 900 × 600 photograph's thin-lens blur. Four-pixel disks
// allow a little softness without accepting a visibly defocused subject.
export function subjectInFocus(depth: number, focalLength: number, aperture: number, distance: number): boolean {
  return depth > 0 && blurRadius(depth, focalLength, aperture, distance, 600) <= 2;
}

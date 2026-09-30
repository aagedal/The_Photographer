import { filterStops, exposureStops, type CameraSettings } from './photography.ts';
import { graduatedStops } from './filters.ts';

export const FLASH_GUIDE_NUMBER = 24;
export const FLASH_SYNC_SPEED = 1 / 250;
export type LightName = 'key' | 'fill' | 'rim';
export interface StudioLightSettings { enabled: boolean; power: number; angle: number; distance: number; height: number; colour: 'daylight' | 'warm' | 'cool' }
export type StudioRig = Record<LightName, StudioLightSettings>;
export const lightNames: LightName[] = ['key', 'fill', 'rim'];
export function defaultStudioRig(): StudioRig {
  return {
    key: { enabled: true, power: 1, angle: -45, distance: 3, height: 2.8, colour: 'daylight' },
    fill: { enabled: true, power: 0.5, angle: 45, distance: 3, height: 2.5, colour: 'daylight' },
    rim: { enabled: true, power: 0.35, angle: 145, distance: 2.5, height: 3, colour: 'warm' },
  };
}
export function normalizeStudioRig(raw: unknown): StudioRig {
  const rig = defaultStudioRig();
  if (!raw || typeof raw !== 'object') return rig;
  for (const name of lightNames) {
    const value = (raw as Record<string, unknown>)[name];
    if (!value || typeof value !== 'object') continue;
    const source = value as Record<string, unknown>;
    for (const [key, min, max] of [['power', 0, 2], ['angle', -160, 160], ['distance', 1, 4], ['height', 1.5, 4]] as const) {
      if (typeof source[key] === 'number' && Number.isFinite(source[key])) rig[name][key] = Math.max(min, Math.min(max, source[key] as number));
    }
    if (typeof source.enabled === 'boolean') rig[name].enabled = source.enabled;
    if (['daylight', 'warm', 'cool'].includes(String(source.colour))) rig[name].colour = source.colour as StudioLightSettings['colour'];
  }
  return rig;
}
export function lightPosition(light: StudioLightSettings, focus: [number, number, number]): [number, number, number] {
  const angle = light.angle * Math.PI / 180;
  return [focus[0] + Math.sin(angle) * light.distance, light.height, focus[2] + Math.cos(angle) * light.distance];
}
function illumination(rig: StudioRig, subjectHeight: number): number {
  // Small ambient contribution plus continuous light at the subject; calibrated to the default rig.
  return 0.025 + lightNames.reduce((sum, name) => {
    const light = rig[name];
    const distanceSquared = light.distance ** 2 + (light.height - subjectHeight) ** 2;
    return sum + (light.enabled ? light.power / distanceSquared : 0);
  }, 0);
}
export function studioExposureOffset(rig: StudioRig, subjectHeight = 1.35): number {
  return Math.log2(illumination(rig, subjectHeight) / illumination(defaultStudioRig(), subjectHeight));
}
export function flashPower(settings: CameraSettings): number {
  return Number.isFinite(settings.flashPower) ? Math.max(0, Math.min(1, settings.flashPower ?? 0)) : 0;
}
export function flashCanFire(settings: CameraSettings): boolean {
  return flashPower(settings) > 0 && settings.shutter >= FLASH_SYNC_SPEED;
}
// Relative exposure from a brief flash pulse. Deliberately independent of shutter duration within sync.
export function flashExposure(settings: CameraSettings, distance: number, imageY = 0.5): number {
  if (!flashCanFire(settings) || !Number.isFinite(distance) || distance <= 0) return 0;
  return (FLASH_GUIDE_NUMBER / (settings.aperture * Math.max(distance, 0.3))) ** 2 * flashPower(settings) * settings.iso / 100 * 2 ** -(filterStops(settings.filter) + graduatedStops(settings.filter, imageY, settings.gradPosition));
}
export function flashRenderIntensity(settings: CameraSettings): number {
  if (!flashCanFire(settings)) return 0;
  return 220 * flashPower(settings) * (4 / settings.aperture) ** 2 * settings.iso / 100 * 2 ** -filterStops(settings.filter);
}
export function subjectExposureStops(settings: CameraSettings, sceneEV: number, distance: number, receivesFlash = true, imageY = 0.5): number {
  return Math.log2(2 ** exposureStops(settings, sceneEV, imageY) + (receivesFlash ? flashExposure(settings, distance, imageY) : 0));
}

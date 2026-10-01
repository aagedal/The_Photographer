import type { Mission } from './missions.ts';
import { WORLD_HALF } from './terrain.ts';

export const DAY_SECONDS = 30 * 60;
// Keep celestial light sources beyond the enlarged terrain. Their visible
// discs render at sky depth so walking and camera far planes cannot move them.
export const CELESTIAL_DISTANCE = WORLD_HALF * 4;
const SOLAR_TILT = Math.PI / 12;
export const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class WorldClock {
  hour: number;
  constructor(hour = 17) { this.hour = Number.isFinite(hour) ? wrapHour(hour) : 17; }
  advance(seconds: number) {
    if (Number.isFinite(seconds)) this.hour = wrapHour(this.hour + Math.max(0, seconds) * 24 / DAY_SECONDS);
  }
  skipTo(hour: number) { if (Number.isFinite(hour)) this.hour = wrapHour(hour); }
}

const EV_KNOTS = [[0,-4],[4,-4],[6,8],[8,13],[12,14],[15,13],[17,12],[18,9],[19,4],[21,-4],[24,-4]];

// A repeating, continuous weather pattern keeps saved skies reproducible.
export function sampleSky(hour: number) {
  hour = wrapHour(hour);
  const angle = (hour - 6) / 24 * Math.PI * 2;
  const elevation = Math.sin(angle);
  const daylight = smooth(-0.12, 0.2, elevation);
  const night = 1 - smooth(-0.35, -0.08, elevation);
  const warmth = (1 - smooth(0.08, 0.55, Math.abs(elevation))) * (1 - night);
  const cloudCover = 0.32 + 0.18 * Math.sin(hour / 24 * Math.PI * 4 + 0.7);
  const knots = EV_KNOTS;
  const index = knots.findIndex((point, i) => i < knots.length - 1 && hour >= point[0] && hour < knots[i + 1][0]);
  const [a, b] = [knots[Math.max(0,index)], knots[Math.max(0,index) + 1]];
  const ev = a[1] + (b[1] - a[1]) * smooth(a[0], b[0], hour) - cloudCover * 0.65;
  const sunStrength = daylight * smooth(0, 0.18, elevation) * (1 - cloudCover * 0.45);
  const lightLevel = 0.18 + daylight * 2.12 + sunStrength * 3.5 + night * 0.22;
  return { hour, elevation, daylight, night, warmth, cloudCover, ev, sunStrength, lightLevel,
    // +X is east, -X west, -Z north. The daytime arc passes to the south.
    sunPosition: [Math.cos(angle) * CELESTIAL_DISTANCE, elevation * Math.cos(SOLAR_TILT) * CELESTIAL_DISTANCE,
      elevation * Math.sin(SOLAR_TILT) * CELESTIAL_DISTANCE] as [number, number, number] };
}
export function formatTime(hour: number) {
  const minutes = Math.floor(wrapHour(hour) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function isMissionTime(mission: Mission, hour: number) {
  const window = mission.timeWindow;
  if (!window) return true;
  hour = wrapHour(hour);
  return window.start < window.end ? hour >= window.start && hour < window.end : hour >= window.start || hour < window.end;
}
export const missionReferenceHour = (mission: Mission) => mission.timeWindow?.preferred ?? 15;
export function missionAmbientEV(mission: Mission, hour: number) {
  // Controlled studio lights stay independent of the outdoor clock.
  return mission.category === 'Studio' ? mission.ev : mission.ev + sampleSky(hour).ev - sampleSky(missionReferenceHour(mission)).ev;
}

import { formatTime, isMissionTime } from './environment.ts';
import type { Mission } from './missions.ts';
export interface CameraSettings { shutter: number; aperture: number; iso: number; filter: 'none' | 'nd6' | 'cpl'; tripod: boolean; panning: boolean; flashPower?: number; focalLength?: number }
export interface Framing { visible: boolean; distance: number; centerOffset: number; occluded: boolean }
export interface Feedback { label: string; passed: boolean; text: string }
export interface Assessment { score: number; passed: boolean; exposureStops: number; feedback: Feedback[] }
export const filterStops = (filter: CameraSettings['filter']) => filter === 'nd6' ? 6 : filter === 'cpl' ? 1 : 0;
export const cameraEV = (s: CameraSettings) => Math.log2(s.aperture ** 2 / s.shutter) - Math.log2(s.iso / 100) + filterStops(s.filter);
export const exposureStops = (s: CameraSettings, sceneEV: number) => sceneEV - cameraEV(s);
export function assessPhoto(mission: Mission, s: CameraSettings, frame: Framing, lighting?: { subjectStops: number; ambientEV: number; hour?: number }): Assessment {
  const stops = lighting?.subjectStops ?? exposureStops(s, mission.ev);
  const exposureOK = Math.abs(stops) <= 1.6;
  const framingOK = frame.visible && !frame.occluded && frame.distance < 65 && frame.distance > 2 && frame.centerOffset < 0.9;
  const feedback: Feedback[] = [
    { label: 'Composition', passed: framingOK, text: framingOK ? `You framed ${mission.subject.toLowerCase()} clearly. You found the story.` : frame.occluded ? 'Something is blocking the subject. Move until you have a clear view.' : `Find ${mission.subject.toLowerCase()}, move within 65 m, and bring it inside the viewfinder.` },
    { label: 'Exposure', passed: exposureOK, text: exposureOK ? 'You kept a useful balance of light and shadow.' : stops > 0 ? `The subject is about ${stops.toFixed(1)} stops too bright. Lower flash or studio power, stop down, lower ISO, or reduce ambient exposure.` : `The subject is about ${Math.abs(stops).toFixed(1)} stops too dark. Add light, slow the shutter, open the aperture, raise ISO, or remove a filter.` },
  ];
  if ((s.flashPower ?? 0) > 0) {
    const synced = s.shutter >= 1 / 250;
    feedback.push({ label: 'Flash sync', passed: synced, text: synced ? 'Within 1/250 s sync. Shutter speed changes the ambient; flash power, aperture, ISO, and distance change the brief flash exposure.' : 'The flash cannot fire above 1/250 s in this prototype. Slow the shutter to 1/250 s or below; high-speed sync is not simulated.' });
    if (lighting && synced) {
      const ambient = exposureStops(s, lighting.ambientEV);
      feedback.push({ label: 'Light balance', passed: true, text: `Ambient ${ambient >= 0 ? '+' : ''}${ambient.toFixed(1)} EV; subject ${stops >= 0 ? '+' : ''}${stops.toFixed(1)} EV. Flash falls off with distance, so a close subject can stay brighter than the background.` });
    }
  }
  if (mission.timeWindow && lighting?.hour !== undefined) {
    const ready = isMissionTime(mission, lighting.hour);
    feedback.push({ label: 'Time of day', passed: ready, text: ready ? `You caught the right light at ${formatTime(lighting.hour)}. ${mission.timeWindow.label}.` : `Taken at ${formatTime(lighting.hour)}. This assignment needs ${mission.timeWindow.label.toLowerCase()}. Meditate from the Esc menu to wait for its preferred time.` });
  }
  const add = (label: string, passed: boolean, yes: string, no: string) => feedback.push({ label, passed, text: passed ? yes : no });
  switch (mission.technique) {
    case 'landscape': add('Depth', s.aperture >= 8, 'Stopping down helps the landscape stay in focus.', 'Try f/8 or smaller (a larger f-number) to keep more of the landscape in focus.'); break;
    case 'water':
      add('Movement', s.shutter >= 0.25, 'The long exposure lets flowing water soften.', 'Try 1/4 second or longer to let the water move through the frame.');
      add('Light control', s.filter === 'nd6', 'The ND filter makes room for a long exposure in daylight.', 'Fit the ND64 filter: it cuts six stops of daylight.');
      add('Stability', s.tripod, 'The tripod keeps the rocks still while the water moves.', 'Use the tripod so the whole photograph does not shake.'); break;
    case 'freeze': add('The moment', s.shutter <= 1 / 500, s.iso >= 800 ? 'Fast shutter, a little noise, and a sharp moment. That is a good trade.' : 'The fast shutter freezes the runner’s movement.', 'Try 1/500 second or faster; raise ISO when you need more light.'); break;
    case 'pan': add('A sense of speed', s.shutter >= 1 / 125 && s.shutter <= 1 / 15 && s.panning, 'Following the runner keeps them clear against a moving background.', 'Use 1/30–1/125 second and switch on Panning to practice following the runner.'); break;
    case 'glass': add('Reflections', s.filter === 'cpl', 'The polarizer reduces the simulated window reflection, with a one-stop light cost.', 'Fit the polarizer. In real life, rotate it and change your angle to find which reflections it can reduce.'); break;
    case 'news': add('A usable moment', s.shutter <= 1 / 125, s.iso >= 800 ? 'You used higher ISO to keep a usable shutter. The story matters more than noise.' : 'A steady handheld shutter preserves the moment.', 'Use at least 1/125 second for this handheld news photograph.'); break;
    case 'couple': add('Separation', s.aperture <= 4, 'A wide aperture separates the couple from the garden.', 'Open to f/4 or wider (a smaller f-number) for a softer background.'); break;
    case 'group': add('Everyone in focus', s.aperture >= 8, 'A smaller aperture gives the group more depth in focus.', 'Try f/8 or smaller to keep people at different depths sharp.'); break;
    case 'portrait': add('Portrait craft', s.aperture >= 2.8 && s.aperture <= 5.6 && s.iso <= 800 && (s.shutter <= 1 / 60 || s.tripod), 'A portrait aperture and clean, steady exposure suit the studio light.', 'Try f/2.8–f/5.6, ISO 800 or below, and a steady shutter of 1/60 or faster (or use a tripod).'); break;
    case 'product': add('Detail', s.aperture >= 8 && s.iso <= 200 && s.tripod, 'Stopping down and using a tripod keeps the product photograph clean and detailed.', 'Try f/8 or smaller, ISO 100–200, and a tripod.'); break;
    case 'stars':
      add('Gathering light', s.shutter >= 5 && s.shutter <= 20 && s.aperture <= 4 && s.iso >= 800, 'A wide aperture and several seconds of exposure gather the faint starlight.', 'Try 5–20 seconds, f/4 or wider, and ISO 800 or above.');
      add('Stability', s.tripod, 'Your camera stays still while the stars become visible.', 'Set up the tripod before a long night exposure.'); break;
    case 'trails':
      add('Time', s.shutter >= 30, 'The longer exposure lets the stars begin to trace paths.', 'Try 30 seconds or longer. Real long trails need much more time.');
      add('Stability', s.tripod, 'The tripod anchors the foreground beneath the moving sky.', 'Use the tripod to keep the foreground steady.'); break;
  }
  const count = feedback.filter(f => f.passed).length;
  const score = Math.round(100 * count / feedback.length);
  return { score, passed: feedback.every(f => f.passed), exposureStops: stops, feedback };
}
export const shutterLabel = (seconds: number) => seconds >= 1 ? `${seconds}″` : seconds >= 0.25 ? `${seconds}s` : `1/${Math.round(1 / seconds)}`;

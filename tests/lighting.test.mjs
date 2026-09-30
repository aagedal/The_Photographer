import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultStudioRig, normalizeStudioRig, lightPosition, studioExposureOffset, flashExposure, flashRenderIntensity, subjectExposureStops } from '../src/lighting.ts';
import { assessPhoto, exposureStops } from '../src/photography.ts';
import { missions } from '../src/missions.ts';
import { createWorld } from '../src/world.ts';
const camera = { shutter: 1 / 250, aperture: 4, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 1 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);

test('doubling flash distance gives one quarter the light, even with a far background', () => {
  near(flashExposure(camera, 6), 1);
  near(flashExposure(camera, 12), 0.25);
  near(flashExposure(camera, 60), 0.01);
});
test('flash exposure responds to power, aperture, ISO, and ND attenuation', () => {
  near(flashExposure({ ...camera, flashPower: 0.25 }, 6), 0.25);
  near(flashExposure({ ...camera, aperture: 8 }, 6), 0.25);
  near(flashExposure({ ...camera, iso: 200 }, 6), 2);
  near(flashExposure({ ...camera, filter: 'nd6' }, 6), 1 / 64);
});
test('slower shutter raises ambient exposure while leaving flash exposure constant', () => {
  const slow = { ...camera, shutter: 1 / 125 };
  near(flashExposure(slow, 6), flashExposure(camera, 6));
  near(flashRenderIntensity(slow), flashRenderIntensity(camera));
  near(exposureStops(slow, 9) - exposureStops(camera, 9), 1);
});
test('sync limit suppresses flash and explains the missed sync in feedback', () => {
  const fast = { ...camera, shutter: 1 / 500 };
  assert.equal(flashExposure(fast, 6), 0);
  assert.equal(flashRenderIntensity(fast), 0);
  const m = missions.find(m => m.id === 'studio-1');
  const result = assessPhoto(m, fast, { visible: true, distance: 6, centerOffset: 0, occluded: false });
  assert.equal(result.feedback.find(f => f.label === 'Flash sync').passed, false);
  assert.match(result.feedback.find(f => f.label === 'Flash sync').text, /1\/250/);
});
test('off, old saves, and distant stars do not receive artificial flash exposure', () => {
  near(flashExposure({ ...camera, flashPower: undefined }, 6), 0);
  near(flashExposure({ ...camera, flashPower: 0 }, 6), 0);
  near(subjectExposureStops(camera, 9, 6, false), exposureStops(camera, 9));
  assert.equal(flashExposure(camera, Infinity), 0);
});
test('a close flash portrait can expose the face while ambient remains dark', () => {
  const rig = defaultStudioRig(); for (const light of Object.values(rig)) light.enabled = false;
  const m = missions.find(m => m.id === 'studio-1');
  const s = { ...camera, flashPower: 0.25 };
  const ev = m.ev + studioExposureOffset(rig);
  const stops = subjectExposureStops(s, ev, 3.5);
  assert.ok(exposureStops(s, ev) < -5);
  assert.ok(Math.abs(stops) < 1);
  assert.equal(assessPhoto(m, s, { visible: true, distance: 3.5, centerOffset: 0, occluded: false }, { subjectStops: stops, ambientEV: ev }).passed, true);
});
test('continuous studio light meter responds to power and distance', () => {
  near(studioExposureOffset(defaultStudioRig()), 0);
  const off = defaultStudioRig(); for (const light of Object.values(off)) light.enabled = false;
  assert.ok(studioExposureOffset(off) < -2.5);
  const close = defaultStudioRig(); close.key.distance = 1;
  assert.ok(studioExposureOffset(close) > 0.5);
  const bright = defaultStudioRig(); bright.key.power = 2;
  assert.ok(studioExposureOffset(bright) > 0);
});
test('world lights move, aim at the subject, change colour and power, and turn off', () => {
  const world = createWorld(), rig = defaultStudioRig(), focus = [28, 1.35, -26];
  rig.key.angle = 0; rig.key.distance = 2; rig.key.power = 2; rig.key.colour = 'cool';
  world.setStudioRig(rig, focus, true);
  const key = world.scene.getObjectByName('studio-key');
  assert.deepEqual(key.position.toArray(), lightPosition(rig.key, focus));
  assert.deepEqual(key.target.position.toArray(), focus);
  assert.equal(key.intensity, 130);
  assert.equal(key.decay, 2);
  assert.equal(key.color.getHexString(), 'b2ceff');
  rig.key.enabled = false; world.setStudioRig(rig, focus, true); assert.equal(key.intensity, 0);
  world.setFlash([0, 1.7, 0], [0, 0, -1], 200);
  const flash = world.scene.getObjectByName('camera-flash');
  assert.equal(flash.visible, true); assert.equal(flash.decay, 2);
  world.setFlash([0, 1.7, 0], [0, 0, -1], 0); assert.equal(flash.visible, false);
});
test('lighting saves tolerate older or malformed data and remain independent', () => {
  assert.deepEqual(normalizeStudioRig(undefined), defaultStudioRig());
  const clamped = normalizeStudioRig({ key: { power: 100, distance: -8, height: NaN, enabled: false, colour: 'unknown' } });
  assert.equal(clamped.key.power, 2); assert.equal(clamped.key.distance, 1); assert.equal(clamped.key.height, 2.8); assert.equal(clamped.key.colour, 'daylight');
  clamped.fill.power = 0; assert.equal(defaultStudioRig().fill.power, 0.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPhoto, cameraEV, exposureStops, filterStops } from '../src/photography.ts';
import { missionReferenceHour, missionAmbientEV } from '../src/environment.ts';
import { categories, missions } from '../src/missions.ts';

const frame = { visible: true, distance: 20, centerOffset: 0.25, occluded: false, contextVisible: true };
const mission = id => missions.find(m => m.id === id);
const standard = { shutter: 1 / 125, aperture: 8, iso: 100, filter: 'none', tripod: false, panning: false };

test('one stop in each control changes exposure in the correct direction', () => {
  const baseline = cameraEV(standard);
  assert.equal(cameraEV({ ...standard, iso: 200 }), baseline - 1);
  assert.equal(cameraEV({ ...standard, shutter: 1 / 250 }), baseline + 1);
  assert.ok(Math.abs(cameraEV({ ...standard, aperture: 8 * Math.sqrt(2) }) - baseline - 1) < 1e-10);
  assert.equal(exposureStops({ ...standard, iso: 200 }, baseline), 1);
});
test('ND64 removes six stops; polarizer removes approximately one', () => {
  assert.equal(filterStops('nd6'), 6);
  assert.equal(filterStops('cpl'), 1);
  assert.equal(cameraEV({ ...standard, filter: 'nd6' }), cameraEV(standard) + 6);
});
test('the curriculum retains each discipline and adds a wildlife assignment', () => {
  assert.equal(new Set(missions.map(m => m.id)).size, 23);
  for (const c of categories) assert.equal(missions.filter(m => m.category === c).length, c === 'Nature' ? 9 : c === 'News' ? 6 : 2);
});
for (const m of missions) {
  test(`suggested settings complete ${m.id} when properly framed`, () => {
    const hour = missionReferenceHour(m), ambientEV = missionAmbientEV(m, hour);
    const result = assessPhoto(m, m.recommended, frame, { hour, ambientEV, gearReady: true, subjectStops: exposureStops(m.recommended, ambientEV) });
    assert.equal(result.passed, true, JSON.stringify(result.feedback));
    assert.equal(result.score, 100);
  });
}
test('sports rewards a fast noisy capture and rejects a bright but blurry moment', () => {
  const m = mission('sports-1');
  const fast = assessPhoto(m, { ...m.recommended, iso: 1600 }, frame);
  assert.equal(fast.passed, true);
  assert.match(fast.feedback[2].text, /noise/);
  const slow = assessPhoto(m, { ...m.recommended, shutter: 1 / 60, iso: 100 }, frame);
  assert.equal(slow.feedback[2].passed, false);
});
test('slow water needs attenuation and support, not just slow shutter', () => {
  const m = mission('nature-2');
  const noND = assessPhoto(m, { ...m.recommended, filter: 'none' }, frame);
  assert.equal(noND.passed, false);
  assert.equal(noND.exposureStops, 6);
  assert.equal(noND.feedback.find(f => f.label === 'Light control').passed, false);
  assert.equal(assessPhoto(m, { ...m.recommended, tripod: false }, frame).passed, false);
});
test('panning requires both tracking and an appropriate shutter', () => {
  const m = mission('sports-2');
  assert.equal(assessPhoto(m, { ...m.recommended, panning: false }, frame).passed, false);
  assert.equal(assessPhoto(m, { ...m.recommended, shutter: 1 / 1000 }, frame).passed, false);
});
test('a polarizer requires compensation for its light loss', () => {
  const m = mission('news-1');
  assert.ok(Math.abs(exposureStops(m.recommended, m.ev)) < 0.15);
  assert.equal(assessPhoto(m, { ...m.recommended, filter: 'none' }, frame).passed, false);
});
test('night exposures cannot pass without a tripod', () => {
  for (const m of missions.filter(m => m.category === 'Astro')) {
    const result = assessPhoto(m, { ...m.recommended, tripod: false }, frame);
    assert.equal(result.passed, false);
    assert.equal(result.feedback.find(f => f.label === 'Stability').passed, false);
  }
});
test('correct settings never complete an unseen, blocked, distant, or edge-clipped subject', () => {
  const m = mission('nature-1');
  for (const bad of [{ visible: false }, { occluded: true }, { distance: 80 }, { distance: 1 }, { centerOffset: 0.98 }]) {
    const result = assessPhoto(m, m.recommended, { ...frame, ...bad });
    assert.equal(result.passed, false);
    assert.equal(result.feedback[0].passed, false);
  }
});
test('extreme underexposure cannot be compensated by meeting the technique', () => {
  const m = mission('nature-1');
  const result = assessPhoto(m, { ...m.recommended, shutter: 1 / 2000, aperture: 22 }, frame);
  assert.equal(result.passed, false);
  assert.equal(result.feedback[1].passed, false);
  assert.match(result.feedback[1].text, /too dark/);
});

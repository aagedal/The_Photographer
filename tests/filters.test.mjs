import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCatalog, filterStops, graduatedStops, gradientPosition, filterLabel } from '../src/filters.ts';
import { cameraEV, exposureStops, assessPhoto } from '../src/photography.ts';
import { flashExposure, subjectExposureStops } from '../src/lighting.ts';
import { createWorld } from '../src/world.ts';
import { missions } from '../src/missions.ts';

const camera = { shutter: 1 / 125, aperture: 8, iso: 100, tripod: true, panning: false, filter: 'none', flashPower: 0.25 };
const frame = { visible: true, distance: 12, centerOffset: 0, occluded: false };
test('ND16, ND32, and ND64 reduce ambient and flash by four, five, and six stops', () => {
  for (const [filter, stops] of [['nd4', 4], ['nd5', 5], ['nd6', 6]]) {
    assert.equal(filterStops(filter), stops);
    assert.ok(Math.abs(cameraEV({ ...camera, filter }) - cameraEV(camera) - stops) < 1e-10);
    assert.equal(flashExposure({ ...camera, filter }, 6) / flashExposure(camera, 6), 2 ** -stops);
  }
  assert.equal(filterStops('cpl'), 1);
  assert.equal(new Set(filterCatalog.map(f => f.id)).size, 5);
  assert.equal(filterLabel('nd4'), 'ND16'); assert.equal(filterLabel('nd5'), 'ND32');
});
test('the graduated filter has a soft three-stop top and clear bottom, and shifts its transition', () => {
  assert.equal(filterStops('gnd3'), 0);
  assert.equal(graduatedStops('gnd3', 0), 3);
  assert.equal(graduatedStops('gnd3', 1), 0);
  assert.ok(Math.abs(graduatedStops('gnd3', 0.5) - 1.5) < 1e-10);
  assert.equal(graduatedStops('gnd3', 0.5, 0.2), 0);
  assert.equal(graduatedStops('gnd3', 0.5, 0.8), 3);
  assert.equal(graduatedStops('nd6', 0), 0);
  assert.equal(gradientPosition(NaN), 0.5); assert.equal(gradientPosition(-1), 0.1); assert.equal(gradientPosition(9), 0.9);
  assert.equal(cameraEV({ ...camera, filter: 'gnd3' }, 0) - cameraEV(camera), 3);
  assert.equal(exposureStops({ ...camera, filter: 'gnd3' }, 13, 1), exposureStops(camera, 13));
});
test('graduated subject metering attenuates both ambient and flash at the subject location', () => {
  const gnd = { ...camera, filter: 'gnd3' };
  const baseline = subjectExposureStops(camera, 13, 6);
  assert.ok(Math.abs(subjectExposureStops(gnd, 13, 6, true, 0) - (baseline - 3)) < 1e-10);
  assert.equal(subjectExposureStops(gnd, 13, 6, true, 1), baseline);
});
test('water exposures accept all uniform NDs with balanced settings, and reject graduated ND', () => {
  const mission = missions.find(m => m.technique === 'water');
  for (const [filter, shutter, aperture] of [['nd4', 0.25, 11], ['nd5', 0.5, 11], ['nd6', 0.5, 8]]) {
    const result = assessPhoto(mission, { ...mission.recommended, filter, shutter, aperture }, frame);
    assert.equal(result.passed, true, JSON.stringify(result.feedback));
  }
  const graduated = assessPhoto(mission, { ...mission.recommended, filter: 'gnd3' }, frame);
  assert.equal(graduated.feedback.find(f => f.label === 'Light control').passed, false);
});
test('CPL suppresses a real planar window reflection while retaining the glass', () => {
  const world = createWorld(), glass = world.scene.getObjectByName('bakery-glass'), reflection = world.scene.getObjectByName('bakery-reflection');
  assert.ok(reflection.isReflector);
  assert.equal(reflection.material.depthWrite, false);
  world.update(1, camera);
  const tint = glass.material.opacity, strength = reflection.material.uniforms.strength.value;
  world.update(1, { ...camera, filter: 'cpl' });
  assert.equal(reflection.material.uniforms.strength.value, strength / 10);
  assert.equal(glass.material.opacity, tint);
  world.update(1, camera); assert.equal(reflection.material.uniforms.strength.value, strength);
});

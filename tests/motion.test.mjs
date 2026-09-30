import test from 'node:test';
import assert from 'node:assert/strict';
import { exposureSamples, cameraShake, handheldWobble } from '../src/motion.ts';
import { createWorld } from '../src/world.ts';

test('handheld view gently moves, settles on the tripod, and respects reduced motion and long lenses', () => {
  const magnitude = wobble => Math.hypot(wobble.yaw, wobble.pitch);
  const handheld = handheldWobble(1, 35, 0, false);
  assert.ok(magnitude(handheld) > 0);
  assert.notDeepEqual(handheldWobble(2, 35, 0, false), handheld);
  assert.deepEqual(handheldWobble(1, 35, 1, false), { yaw: 0, pitch: 0 });
  assert.deepEqual(handheldWobble(1, 35, 0, true), { yaw: 0, pitch: 0 });
  assert.ok(magnitude(handheldWobble(1, 35, .5, false)) < magnitude(handheld));
  assert.ok(magnitude(handheldWobble(1, 600, 0, false)) < magnitude(handheld));
  for (let time = 0; time < 60; time += .1) {
    const wobble = handheldWobble(time, 35, 0, false);
    assert.ok(Math.abs(wobble.yaw) <= .0016 && Math.abs(wobble.pitch) <= .0012);
  }
});

test('fast shutters freeze a moment, slower shutters sample their full exposure interval', () => {
  assert.deepEqual(exposureSamples(1 / 1000), [0]);
  for (const shutter of [1 / 125, 1 / 30, 0.5, 5, 60]) {
    const samples = exposureSamples(shutter);
    assert.ok(samples.length > 1 && samples.length <= 33);
    assert.equal(samples[Math.floor(samples.length / 2)], 0);
    assert.ok(Math.abs(samples[0] + samples.at(-1)) < 1e-10);
    const step = shutter / samples.length;
    assert.ok(Math.abs(samples.at(-1) - samples[0] + step - shutter) < 1e-10);
  }
});

test('tripods remove camera shake but panning only reduces handheld shake', () => {
  const settings = { shutter: .5, focalLength: 35, tripod: false, panning: false };
  const shake = cameraShake(settings, .2, 1);
  assert.ok(Math.hypot(shake.yaw, shake.pitch) > 0);
  assert.deepEqual(cameraShake({ ...settings, tripod: true }, .2, 1), { yaw: 0, pitch: 0 });
  assert.deepEqual(cameraShake({ ...settings, shutter: 1 / 500 }, .001, 1), { yaw: 0, pitch: 0 });
  const pan = cameraShake({ ...settings, panning: true }, .2, 1);
  assert.ok(Math.hypot(pan.yaw, pan.pitch) < Math.hypot(shake.yaw, shake.pitch));
  const telephoto = cameraShake({ ...settings, shutter: 1 / 125, focalLength: 600 }, .003, 1);
  assert.ok(Math.hypot(telephoto.yaw, telephoto.pitch) > 0);
});

test('sampling an exposure restores the exact animated world and does not alter water with shutter settings', () => {
  const world = createWorld();
  const settings = { shutter: 1 / 1000, filter: 'none' };
  const snapshot = () => {
    world.scene.updateMatrixWorld(true);
    const transforms = [];
    world.scene.traverse(object => transforms.push([...object.matrixWorld.elements]));
    return transforms;
  };
  world.update(1, settings);
  const before = snapshot();
  for (const offset of exposureSamples(.5)) world.update(1 + offset, { ...settings, shutter: .5 });
  assert.notDeepEqual(snapshot(), before);
  world.update(1, { ...settings, shutter: .5 });
  assert.deepEqual(snapshot(), before);
  // Captures near the start of play sample negative times, too.
  world.update(-.2, settings);
  assert.ok(snapshot().flat().every(Number.isFinite));
});

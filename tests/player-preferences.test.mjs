import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences, restoreExposure, normalizeLook, FrameClock } from '../src/player-preferences.ts';

test('legacy and malformed preferences preserve usable controls', () => {
  const defaults = { grid: 'thirds', sensitivity: 1, quality: 'balanced' };
  for (const raw of [undefined, null, {}, { grid: 'bad', sensitivity: '1', quality: true }, { sensitivity: NaN }]) {
    assert.deepEqual(normalizePreferences(raw), defaults);
  }
  assert.equal(normalizePreferences({ sensitivity: -9 }).sensitivity, .5);
  assert.equal(normalizePreferences({ sensitivity: 90 }).sensitivity, 1.5);
  const chosen = { grid: 'none', sensitivity: .75, quality: 'performance' };
  assert.deepEqual(normalizePreferences(JSON.parse(JSON.stringify(chosen))), chosen);
});

test('saved exposure round-trips without granting equipment or deploying a tripod', () => {
  const fallback = { shutter: 1/125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0 };
  const raw = { shutter: .5, aperture: 11, iso: 1600, panning: true, filter: 'nd6', tripod: true, flashPower: 1 };
  assert.deepEqual(restoreExposure(JSON.parse(JSON.stringify(raw)), fallback), { ...fallback, shutter: .5, aperture: 11, iso: 1600, panning: true });
  assert.deepEqual(restoreExposure({ shutter: -1, aperture: Infinity, iso: '400', panning: 'true' }, fallback), fallback);
  assert.deepEqual(restoreExposure(null, fallback), fallback);
  assert.equal(restoreExposure({ iso: 800 }, fallback).iso, 800);
});

test('saved view direction wraps yaw, bounds pitch and rejects incomplete views', () => {
  for (const raw of [undefined, null, {}, { yaw: 0 }, { yaw: Infinity, pitch: 0 }, { yaw: 0, pitch: '0' }]) assert.equal(normalizeLook(raw), undefined);
  const look = normalizeLook({ yaw: Math.PI * 10 + .6, pitch: -99 });
  assert.ok(Math.abs(look.yaw - .6) < 1e-10);
  assert.equal(look.pitch, -1.3);
  assert.deepEqual(normalizeLook({ yaw: .5, pitch: .2 }), { yaw: .5, pitch: .2 });
});

test('inactive frames and a suspended browser cannot advance game time on return', () => {
  const clock = new FrameClock();
  assert.equal(clock.tick(1000, true), 0);
  assert.equal(clock.tick(1050, true), .05);
  assert.equal(clock.tick(1100, false), 0);
  assert.equal(clock.tick(301100, true), 0);
  assert.equal(clock.tick(301150, true), .05);
  clock.reset(301150); // blur/visibility event before requestAnimationFrame stops
  assert.equal(clock.tick(901150, true), 0);
  assert.equal(clock.tick(901200, true), .05);
  assert.equal(clock.tick(901100, true), 0);
});

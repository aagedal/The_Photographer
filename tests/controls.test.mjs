import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustCameraSetting, TripodState } from '../src/controls.ts';
import { exposureStops } from '../src/photography.ts';
const settings = { shutter: 1/125, aperture: 5.6, iso: 400, filter: 'cpl', tripod: true, panning: true, flashPower: .25 };

test('paired shortcuts change the requested camera control in both directions', () => {
  for (const [key, control, expected] of [['1','shutter',1/60],['2','shutter',1/250],['3','aperture',4],['4','aperture',8],['5','iso',200],['6','iso',800]]) {
    const result = adjustCameraSetting(settings, key);
    assert.equal(result.control, control);
    assert.deepEqual(result.settings, { ...settings, [control]: expected });
  }
  assert.equal(adjustCameraSetting(settings, 'w'), null);
});
test('shortcuts produce the intended brighter and darker exposure changes', () => {
  const baseline = exposureStops(settings, 10);
  for (const key of ['1','3','6']) assert.ok(exposureStops(adjustCameraSetting(settings, key).settings,10) > baseline);
  for (const key of ['2','4','5']) assert.ok(exposureStops(adjustCameraSetting(settings, key).settings,10) < baseline);
});
test('held shortcuts stay inside camera limits', () => {
  for (const [key, control, expected] of [['1','shutter',60],['2','shutter',1/2000],['3','aperture',1.8],['4','aperture',22],['5','iso',100],['6','iso',6400]]) {
    let current = settings;
    for (let i=0;i<50;i++) current = adjustCameraSetting(current,key).settings;
    assert.equal(current[control], expected);
  }
});
test('tripod locks movement immediately but becomes stable only after setup', () => {
  const t = new TripodState(); t.request(true);
  assert.equal(t.movementLocked,true); assert.equal(t.deployed,false);
  t.update(.2); assert.equal(t.transitioning,true); assert.equal(t.deployed,false);
  t.update(.22); assert.equal(t.deployed,true); assert.equal(t.transitioning,false);
  t.request(false); assert.equal(t.deployed,false); assert.equal(t.movementLocked,true);
  t.update(.14); assert.equal(t.movementLocked,true);
  t.update(.14); assert.equal(t.movementLocked,false); assert.equal(t.transitioning,false);
});
test('tripod reverses mid-animation and ignores negative frame time', () => {
  const t = new TripodState(); t.toggle(); t.update(.21);
  assert.equal(t.progress,.5); t.update(-1); assert.equal(t.progress,.5);
  t.toggle(); t.update(.14); assert.equal(t.progress,0); assert.equal(t.movementLocked,false);
});
test('instant setup for reduced motion and travel has no lingering transition', () => {
  const t = new TripodState(); t.request(true,true);
  assert.equal(t.deployed,true); assert.equal(t.transitioning,false);
  t.request(false,true); assert.equal(t.progress,0); assert.equal(t.movementLocked,false);
});

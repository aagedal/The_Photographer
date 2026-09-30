import test from 'node:test';
import assert from 'node:assert/strict';
import { blurRadius, blurScale } from '../src/optics.ts';

test('the focus plane is sharp while foreground and background are defocused', () => {
  assert.equal(blurRadius(3, 120, 1.8, 3), 0);
  assert.ok(blurRadius(1.5, 120, 1.8, 3) > 20);
  assert.ok(blurRadius(8, 120, 1.8, 3) > 20);
  // A 120 mm f/1.8 lens at 3 m makes a 2.778 mm blur disk at infinity.
  assert.ok(Math.abs(blurRadius(Infinity, 120, 1.8, 3) - 34.7222222222) < 1e-8);
});

test('aperture, focal length, distance, and resolution change depth of field', () => {
  const wide = blurRadius(8, 120, 1.8, 3);
  assert.ok(Math.abs(wide / blurRadius(8, 120, 16, 3) - 16 / 1.8) < 1e-10);
  assert.ok(blurRadius(8, 35, 1.8, 3) < wide / 10);
  assert.ok(blurRadius(8, 120, 1.8, 5) < wide);
  assert.equal(blurRadius(8, 120, 1.8, 3, 1200), wide * 2);
});

test('infinity focus keeps stars sharp and crop math matches the live sensor area', () => {
  assert.ok(blurRadius(450, 35, 2.8, 1e6) < 0.02);
  assert.ok(Number.isFinite(blurRadius(0, 600, 1.8, 0.2)));
  // A portrait viewport sees more than the sensor crop: half its height is
  // the same 24 mm sensor area, hence half the pixel blur radius.
  assert.equal(blurScale(120, 1.8, 3, 600, 48), blurScale(120, 1.8, 3, 600) / 2);
});

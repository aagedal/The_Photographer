import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchWalk } from '../src/touch-controls.ts';

test('thumb movement has a dead zone, gradual speed, and a circular speed limit', () => {
  const walk = new TouchWalk(); walk.begin(1);
  walk.move(1, 3, 0, 40);
  assert.equal(walk.side, 0); assert.equal(walk.forward, 0);
  walk.move(1, 0, -20, 40);
  assert.ok(walk.forward > 0 && walk.forward < 1); assert.equal(walk.side, 0);
  walk.move(1, 100, -100, 40);
  assert.ok(Math.abs(Math.hypot(walk.side, walk.forward) - 1) < 1e-9);
  assert.ok(Math.abs(Math.hypot(walk.offsetX, walk.offsetY) - 40) < 1e-9);
  walk.move(1, -40, 0, 40); assert.equal(walk.side, -1);
  walk.move(1, 0, 40, 40); assert.equal(walk.forward, -1);
});

test('a second finger cannot steal or release the walking thumb', () => {
  const walk = new TouchWalk(); assert.equal(walk.begin(10), true);
  assert.equal(walk.begin(11), false);
  walk.move(10, 0, -40, 40);
  walk.move(11, 40, 0, 40); walk.end(11);
  assert.equal(walk.forward, 1); assert.equal(walk.side, 0);
  assert.equal(walk.pointerId, 10);
  walk.end(10);
  assert.equal(walk.pointerId, null); assert.equal(walk.forward, 0);
  assert.equal(walk.offsetY, 0);
});

test('hiding or cancelling controls clears movement and permits a fresh touch', () => {
  const walk = new TouchWalk(); walk.begin(1); walk.move(1, 40, 0, 40);
  walk.reset(); walk.move(1, 40, 0, 40);
  assert.equal(walk.side, 0); assert.equal(walk.offsetX, 0);
  assert.equal(walk.begin(2), true);
  walk.move(2, 0, -40, 40); assert.equal(walk.forward, 1);
});

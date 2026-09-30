import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { creekPath, creekDistance, creekPoint } from '../src/creek.ts';
import { terrainHeight } from '../src/terrain.ts';
import { createWorld } from '../src/world.ts';

test('the waterfall channel stays submerged and joins the lake without a dry gap', () => {
  const world = createWorld(), surface = world.scene.getObjectByName('creek-water');
  world.scene.updateMatrixWorld(true);
  for (let t = 0; t <= 1; t += 0.005) {
    const p = creekPoint(t);
    assert.ok(creekDistance(p.x, p.z) < 0.00001);
    assert.ok(terrainHeight(p.x, p.z) < -0.9);
    assert.equal(world.canWalk(p.x, p.z), false);
    const ray = new THREE.Raycaster(new THREE.Vector3(p.x, 2, p.z), new THREE.Vector3(0, -1, 0));
    assert.ok(ray.intersectObject(surface).length > 0, `dry channel at ${t}`);
  }
  const mouth = creekPath.at(-1);
  assert.ok(Math.abs(mouth.x + 7) < 14 && Math.abs(mouth.z + 3) < 11.5);
  assert.equal(world.canWalk(-29, 4), true, 'ranger bank stays reachable');
  assert.equal(world.canWalk(-24, -15), false, 'cliff cannot be walked through');
});

test('the enlarged cliff is taller than the falling water and all creek animation rewinds', () => {
  const world = createWorld(), cliff = world.scene.getObjectByName('waterfall-cliff'), curtain = world.scene.getObjectByName('waterfall-curtain');
  const bounds = new THREE.Box3().setFromObject(cliff), waterBounds = new THREE.Box3().setFromObject(curtain);
  assert.ok(bounds.max.y >= 8.6 && bounds.max.x - bounds.min.x > 20);
  assert.ok(waterBounds.max.y - waterBounds.min.y > 8);
  const snapshot = () => ['creek-flow-foam', 'waterfall-spray'].map(name => [...world.scene.getObjectByName(name).instanceMatrix.array]);
  world.update(2, { shutter: 1 / 1000, filter: 'none' }); const first = snapshot();
  world.update(2.3, { shutter: 0.5, filter: 'none' }); assert.notDeepEqual(snapshot(), first);
  world.update(2, { shutter: 0.5, filter: 'none' }); assert.deepEqual(snapshot(), first);
  world.update(-10, { shutter: 60, filter: 'cpl' }); assert.ok(snapshot().flat().every(Number.isFinite));
});

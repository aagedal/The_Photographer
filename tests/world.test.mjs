import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, subjectPosition } from '../src/world.ts';
import { missions } from '../src/missions.ts';

test('every travel viewpoint is walkable and provides a clear view of its subject', () => {
  const world = createWorld();
  world.update(0, { filter: 'none', shutter: 1 / 125 });
  world.scene.updateMatrixWorld(true);
  for (const m of missions) {
    const player = new THREE.Vector3(...m.viewpoint);
    assert.equal(world.canWalk(player.x, player.z), true, `${m.id} viewpoint is blocked`);
    assert.equal(world.subjects.has(m.subject), true, `${m.id} subject is missing`);
    const target = subjectPosition(world, m);
    const d = target.clone().sub(player);
    const ray = new THREE.Raycaster(player, d.clone().normalize(), 0, d.length() - 0.7);
    if (m.category !== 'Astro') assert.equal(ray.intersectObjects(world.solids, false).length, 0, `${m.id} subject is occluded`);
    const camera = new THREE.PerspectiveCamera(55, 2.5, 0.1, 240);
    camera.position.copy(player); camera.lookAt(target); camera.updateMatrixWorld();
    const projected = target.clone().project(camera);
    assert.ok(Math.abs(projected.x) < 0.01 && Math.abs(projected.y) < 0.01 && projected.z < 1, `${m.id} subject cannot be framed`);
  }
});
test('world boundaries and lake restrict movement while the jetty stays walkable', () => {
  const world = createWorld();
  assert.equal(world.canWalk(60, 0), false);
  assert.equal(world.canWalk(-7, -3), false);
  assert.equal(world.canWalk(0, 5), true);
  assert.equal(world.canWalk(8, 16), true);
});

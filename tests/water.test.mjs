import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { terrainHeight } from '../src/terrain.ts';
import { isolateReflections } from '../src/water.ts';

test('fish stay under the surface and above the basin, with continuous rewindable swimming', () => {
  const world = createWorld(), fish = [];
  world.scene.traverse(object => { if (/^(jetty|lake|east-lake|wetland)-fish-\d+$/.test(object.name)) fish.push(object); });
  assert.equal(fish.length, 23);
  const position = new THREE.Vector3();
  for (let time = -30; time <= 120; time += 0.7) {
    world.update(time, { filter: 'none', shutter: 1 / 1000 }); world.scene.updateMatrixWorld(true);
    for (const animal of fish) {
      animal.getWorldPosition(position);
      const surface = animal.name.startsWith('wetland') ? 1.28 : 0.11;
      assert.ok(position.y + 0.22 < surface, `${animal.name} breaches water`);
      assert.ok(position.y - 0.18 > terrainHeight(position.x, position.z), `${animal.name} intersects the basin`);
      assert.ok(animal.matrixWorld.elements.every(Number.isFinite));
    }
  }
  const snapshot = () => {
    const transforms = fish.map(animal => [...animal.matrixWorld.elements]);
    world.scene.traverse(object => { if (object.isInstancedMesh && object.parent?.name.endsWith('-fish')) transforms.push([...object.instanceMatrix.array]); });
    return transforms;
  };
  world.update(1, { filter: 'none', shutter: 1 / 1000 }); world.scene.updateMatrixWorld(true); const first = snapshot();
  world.update(2, { filter: 'none', shutter: 0.5 }); world.scene.updateMatrixWorld(true); assert.notDeepEqual(snapshot(), first);
  world.update(1, { filter: 'none', shutter: 0.5 }); world.scene.updateMatrixWorld(true); assert.deepEqual(snapshot(), first);
});

test('CPL reduces lake and wetland glare without changing fish or water depth', () => {
  const world = createWorld();
  world.update(4, { filter: 'none', shutter: 1 / 125 });
  for (const name of ['lake', 'wetland']) {
    const surface = world.scene.getObjectByName(`${name}-water`), reflection = world.scene.getObjectByName(`${name}-reflection`);
    assert.ok(reflection.isReflector); assert.equal(surface.material.depthWrite, false); assert.equal(reflection.material.depthWrite, false);
    assert.ok(surface.material.opacity < 0.2);
    assert.equal(reflection.material.uniforms.polarization.value, 1);
  }
  world.update(4, { filter: 'cpl', shutter: 1 / 125 });
  for (const name of ['lake', 'wetland']) assert.equal(world.scene.getObjectByName(`${name}-reflection`).material.uniforms.polarization.value, 0.12);
  assert.ok(terrainHeight(-7, -3) < -1.5); assert.ok(terrainHeight(76, -54) < 0.1);
  assert.equal(world.groundHeight(0, 5), 0); assert.equal(world.canWalk(0, 5), true);
});

test('single-pass reflections hide other reflectors and restore visibility even on failure', () => {
  const a = new THREE.Mesh(), b = new THREE.Mesh(), c = new THREE.Mesh(); c.visible = false;
  a.onBeforeRender = () => { assert.equal(b.visible, false); assert.equal(c.visible, false); a.visible = false; throw new Error('failed reflection'); };
  isolateReflections([a, b, c]);
  assert.throws(() => a.onBeforeRender(), /failed reflection/);
  assert.equal(a.visible, true); assert.equal(b.visible, true); assert.equal(c.visible, false);
});

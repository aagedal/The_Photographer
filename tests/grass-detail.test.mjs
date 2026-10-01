import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { grassDensity, partitionGrass, GrassBatch } from '../src/grass-detail.ts';

test('grass thins with projected size, keeps telephoto detail and restores its full focus population', () => {
  const source = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 1), new THREE.MeshStandardMaterial(), 100);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < source.count; i++) source.setMatrixAt(i, matrix.makeTranslation(i / 100, 0, -1));
  source.name = 'grass'; source.receiveShadow = true;
  const group = partitionGrass(source); group.updateMatrixWorld(true);
  const batch = group.children[0]; assert.ok(batch instanceof GrassBatch);
  const camera = new THREE.PerspectiveCamera(58, 1.5, 0.1, 900);
  const countAt = distance => { camera.position.z = distance; camera.updateMatrixWorld(); return batch.drawCount(camera); };
  assert.equal(countAt(2), 100);
  const distant = countAt(70); assert.ok(distant > 0 && distant < 30);
  assert.equal(countAt(150), 0);
  camera.fov = 18; camera.updateProjectionMatrix();
  assert.ok(countAt(70) > distant * 2, 'a narrow lens retains distant blades');
  camera.fov = 58; camera.updateProjectionMatrix();
  batch.onBeforeRender(null, null, camera); assert.ok(batch.count < 100);
  batch.onAfterRender(); assert.equal(batch.count, 100);
  camera.fov = 58; camera.updateProjectionMatrix(); countAt(2);
  batch.onBeforeRender(null, null, camera); assert.equal(batch.count, 100, 'another camera restores nearby detail');
  batch.onAfterRender();
  assert.equal(batch.castShadow, false); assert.equal(batch.receiveShadow, true);
});

test('grass density fades continuously and full tiles retain every instance and color', () => {
  assert.equal(grassDensity(0), 1); assert.equal(grassDensity(120), 0);
  let previous = 1;
  for (let d = 0; d <= 150; d += 0.1) { const density = grassDensity(d); assert.ok(density <= previous + 1e-9); assert.ok(previous - density < 0.01); previous = density; }
  const source = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 3);
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (const [i, x] of [-30, 1, 30].entries()) { source.setMatrixAt(i, matrix.makeTranslation(x, 0, 0)); source.setColorAt(i, color.setRGB(i / 3, 0.5, 1)); }
  const group = partitionGrass(source);
  assert.equal(group.children.length, 3);
  const recovered = group.children.map(mesh => { mesh.getMatrixAt(0, matrix); mesh.getColorAt(0, color); return [matrix.elements[12], color.r]; });
  assert.deepEqual(recovered, [[-30, 0], [1, 1 / 3], [30, 2 / 3]].map(([x, c]) => [x, Math.fround(c)]));
});

test('autofocus ignores fully faded grass but a telephoto lens can resolve it again', () => {
  const source = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1, 0.2), new THREE.MeshStandardMaterial(), 1);
  source.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, -150));
  const group = partitionGrass(source); group.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(58, 1.5, 0.1, 900), ray = new THREE.Raycaster();
  camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2(), camera);
  assert.equal(ray.intersectObject(group, true).length, 0);
  camera.fov = 10; camera.updateProjectionMatrix(); ray.setFromCamera(new THREE.Vector2(), camera);
  assert.ok(ray.intersectObject(group, true).length > 0);
  assert.equal(group.children[0].count, 1, 'focus picking leaves the population intact');
});

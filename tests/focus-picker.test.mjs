import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFocusPicker } from '../src/focus-picker.ts';

test('focus tiles match exact terrain triangles for vertical, diagonal and boundary rays', () => {
  const scene = new THREE.Scene(), geometry = new THREE.PlaneGeometry(64, 64, 64, 64);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, Math.sin(positions.getX(i) * 0.2) * Math.cos(positions.getZ(i) * 0.13) * 4);
  const land = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()); land.name = 'rolling-terrain'; scene.add(land);
  land.position.set(3, 2, -5); scene.updateMatrixWorld(true);
  const picker = createFocusPicker(scene), ray = new THREE.Raycaster();
  for (let i = 0; i < 100; i++) {
    const x = i < 4 ? [-32, -16, 0, 16][i] + 3 : Math.sin(i * 12.3) * 28 + 3;
    const z = Math.cos(i * 7.1) * 28 - 5;
    ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(i % 2 ? 0.1 : 0, -1, i % 3 ? 0 : 0.1).normalize());
    const exact = ray.intersectObject(land, false)[0], accelerated = picker.pick(ray);
    assert.equal(!!accelerated, !!exact);
    if (exact) { assert.ok(exact.point.distanceTo(accelerated.point) < 1e-6); assert.equal(accelerated.object, land); }
    assert.ok(picker.stats.raycasts < 8, 'only terrain tiles along the ray are tested');
  }
  ray.set(new THREE.Vector3(3, 30, -5), new THREE.Vector3(0, -1, 0)); ray.far = 2;
  assert.equal(picker.pick(ray), undefined);
  ray.far = Infinity; ray.near = 40; assert.equal(picker.pick(ray), undefined);
});

test('focus stops at the nearest object, respects visibility and opacity, and follows moving objects', () => {
  const scene = new THREE.Scene(), material = new THREE.MeshStandardMaterial();
  const near = new THREE.Mesh(new THREE.BoxGeometry(), material), far = near.clone(), hidden = near.clone(), glass = near.clone();
  near.position.z = -3; far.position.z = -20; hidden.position.z = -1; glass.position.z = -2;
  glass.material = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2, depthWrite: false });
  const hiddenParent = new THREE.Group(); hiddenParent.visible = false; hiddenParent.add(hidden);
  scene.add(near, far, hiddenParent, glass); scene.updateMatrixWorld(true);
  const picker = createFocusPicker(scene), ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
  assert.equal(picker.pick(ray).object, near); assert.equal(picker.stats.raycasts, 1);
  near.position.x = 10; scene.updateMatrixWorld(true);
  assert.equal(picker.pick(ray).object, far);
  hiddenParent.visible = true; assert.equal(picker.pick(ray).object, hidden);
  hiddenParent.visible = false; far.visible = false; assert.equal(picker.pick(ray), undefined);
});

test('instanced grass remains available for close-up focus', () => {
  const scene = new THREE.Scene(), grass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial(), 2);
  grass.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, -2));
  grass.setMatrixAt(1, new THREE.Matrix4().makeTranslation(1, 0, -3));
  grass.name = 'wind-meadow-grass-cell-0'; scene.add(grass); scene.updateMatrixWorld(true);
  const picker = createFocusPicker(scene), ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
  assert.equal(picker.pick(ray).object, grass); assert.equal(picker.pick(ray).instanceId, 0);
});

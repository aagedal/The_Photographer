import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { notebookMissions } from '../src/notebook.ts';
import { cameraStore, atCameraStore } from '../src/camera-store.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { missions } from '../src/missions.ts';
import { assessPhoto } from '../src/photography.ts';

test('notebook status sections are disjoint and never reveal undiscovered missions', () => {
  const known = ['nature-1', 'nature-2', 'sports-1'];
  const completed = ['nature-1'];
  assert.deepEqual(notebookMissions(known, completed, 'nature-2', 'active').map(m => m.id), ['nature-2']);
  assert.deepEqual(notebookMissions(known, completed, 'nature-2', 'available').map(m => m.id), ['sports-1']);
  assert.deepEqual(notebookMissions(known, completed, 'nature-2', 'completed').map(m => m.id), ['nature-1']);
  assert.deepEqual(notebookMissions(known, completed, 'nature-1', 'active'), []);
  assert.deepEqual(notebookMissions(known, completed, 'nature-1', 'available').map(m => m.id), ['nature-2', 'sports-1']);
});

test('camera store is reachable, solid, and requires proximity at player height', () => {
  const world = createWorld();
  const [x, z] = cameraStore.entrance, y = world.groundHeight(x, z) + 1.7;
  assert.equal(world.canWalk(x, z), true);
  assert.equal(atCameraStore(x, y, z), true);
  assert.equal(atCameraStore(x + 20, y, z), false);
  assert.equal(atCameraStore(x, y + 20, z), false);
  assert.equal(world.canWalk(cameraStore.x, cameraStore.z), false);
  assert.ok(world.scene.getObjectByName('camera-store'));
});

test('first deer photograph stays at a respectful distance throughout the arrival hour', () => {
  const world = createWorld(), m = missions.find(m => m.id === 'intro-deer');
  const eye = new THREE.Vector3(m.viewpoint[0], world.groundHeight(m.viewpoint[0], m.viewpoint[2]) + 1.7, m.viewpoint[2]);
  for (let hour = 17; hour < 18; hour += 0.01) {
    world.setTime(hour); world.update(0, m.recommended); world.scene.updateMatrixWorld(true);
    const direction = subjectPosition(world, m).sub(eye);
    assert.ok(direction.length() >= 6, `deer too close at ${hour}`);
    assert.equal(new THREE.Raycaster(eye, direction.clone().normalize(), 0, direction.length() - 0.7).intersectObjects(world.solids, false).length, 0);
  }
  const frame = { visible: true, occluded: false, centerOffset: 0.1, distance: 10 };
  assert.equal(assessPhoto(m, m.recommended, frame).passed, true);
  assert.equal(assessPhoto(m, m.recommended, {...frame, distance: 4}).passed, false);
  assert.equal(assessPhoto(m, {...m.recommended, shutter: 1/60}, frame).passed, false);
});

test('opening camera paths settle without motion and finish hides the gift and ranger', () => {
  const world = createWorld(), camera = new THREE.PerspectiveCamera(55, 16/9, 0.1, 450);
  world.opening.update(camera, 0, 1, true);
  const fixed = camera.position.clone();
  world.opening.update(camera, 0, 4, true);
  assert.deepEqual(camera.position, fixed);
  world.opening.update(camera, 2, 1, false);
  assert.equal(world.scene.getObjectByName('intro-camera').visible, true);
  assert.equal(world.scene.getObjectByName('arrival-ranger').visible, true);
  world.opening.finish();
  assert.equal(world.scene.getObjectByName('intro-camera').visible, false);
  assert.equal(world.scene.getObjectByName('arrival-ranger').visible, false);
  assert.equal(world.canWalk(8, 103), true);
  assert.equal(world.groundHeight(8, 103), 0.65);
  assert.equal(world.canWalk(12, 103), false);
});

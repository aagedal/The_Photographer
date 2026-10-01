import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ARRIVAL_DURATION, arrivalPose, boatBerth } from '../src/arrival-route.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { WORLD_HALF, coastline, terrainHeight } from '../src/terrain.ts';
import { regionalLandmarks } from '../src/landmarks.ts';
import { missions } from '../src/missions.ts';
import { freshStory, storyDiscoveries, normalizeStory, horizonAlbum, horizonAlbumDialogue } from '../src/story.ts';

const filter = { filter: 'none', shutter: 1 / 125 };
test('the map has four times the area, and each outer landmark has a reachable entrance and viewpoint', () => {
  assert.equal((WORLD_HALF / 130) ** 2, 4);
  const world = createWorld(); world.scene.updateMatrixWorld(true);
  for (const place of regionalLandmarks) {
    assert.ok(Math.max(Math.abs(place.x), Math.abs(place.z)) > 130, place.name);
    assert.ok(world.scene.getObjectByName(`landmark-${place.id}`));
    assert.equal(world.canWalk(...place.entrance), true, `${place.name} entrance`);
    assert.equal(world.canWalk(...place.viewpoint), true, `${place.name} viewpoint`);
    const m = missions.find(m => m.id === place.mission), eye = new THREE.Vector3(m.viewpoint[0], terrainHeight(...place.viewpoint) + 1.7, m.viewpoint[2]);
    const target = subjectPosition(world, m), direction = target.clone().sub(eye);
    assert.ok(direction.length() < 65, `${place.name} can complete a photograph`);
    assert.equal(new THREE.Raycaster(eye, direction.normalize(), 0, target.distanceTo(eye) - 0.7).intersectObjects(world.solids, false).length, 0, `${place.name} view`);
  }
});
test('the complete ferry hull clears all coastal rocks, shore and dock throughout the longer journey', () => {
  assert.ok(ARRIVAL_DURATION >= 30);
  const world = createWorld(), rocks = world.scene.getObjectByName('coastal-rocks'), boat = world.scene.getObjectByName('arrival-boat');
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 900), matrix = new THREE.Matrix4();
  const rockBounds = Array.from({length: rocks.count}, (_, i) => {
    rocks.getMatrixAt(i, matrix);
    return rocks.geometry.boundingBox?.clone().applyMatrix4(matrix) ?? new THREE.Box3().setFromBufferAttribute(rocks.geometry.getAttribute('position')).applyMatrix4(matrix);
  }).filter(b => b.max.x - b.min.x > 0.01);
  const dockBounds = new THREE.Box3().setFromObject(world.scene.getObjectByName('arrival-dock'));
  let previous = arrivalPose(0), distance = 0;
  for (let seconds = 0; seconds <= ARRIVAL_DURATION; seconds += 0.1) {
    world.opening.update(camera, 0, seconds, false); world.scene.updateMatrixWorld(true);
    const pose = arrivalPose(seconds), bounds = new THREE.Box3().setFromObject(boat);
    distance += Math.hypot(pose.x - previous.x, pose.z - previous.z); previous = pose;
    assert.ok(pose.z > coastline(pose.x) + 6, `boat left the channel at ${seconds}`);
    assert.equal(bounds.intersectsBox(dockBounds), false, `boat hit dock at ${seconds}`);
    for (const rock of rockBounds) assert.equal(bounds.intersectsBox(rock), false, `boat hit rock at ${seconds}`);
  }
  assert.ok(distance > 210, 'a substantial drive along the coast');
  world.opening.finish(); assert.deepEqual([boat.position.x,boat.position.z],[...boatBerth]);
});
test('Arthur’s optional album unlocks together and survives reloads without changing the main ending', () => {
  const ids = regionalLandmarks.map(p => p.mission), story = {...freshStory(),deerShown:true};
  assert.equal(storyDiscoveries(freshStory(),[],ids).some(id => ids.includes(id)),false);
  for (const id of ids) assert.ok(storyDiscoveries(story,['intro-deer'],[]).includes(id));
  const printed = {...story, prints: ids.map(id => ({photoId:`photo-${id}`,missionId:id,image:'data:image/jpeg;base64,abc'}))};
  const restored = normalizeStory(JSON.parse(JSON.stringify(printed)),['intro-deer',...ids]);
  assert.equal(horizonAlbum(restored).filter(p=>p.printed).length,4);
  assert.match(horizonAlbumDialogue(restored),/All four/);
  assert.equal(restored.reconciled,false);
});
test('windmill and beacon rewind exactly when exposure samples restore world time', () => {
  const world = createWorld(), sails = world.scene.getObjectByName('briar-windmill-sails');
  world.update(7,filter); const rotation=sails.rotation.z;
  world.update(12,filter); assert.notEqual(sails.rotation.z,rotation);
  world.update(7,filter); assert.equal(sails.rotation.z,rotation);
});

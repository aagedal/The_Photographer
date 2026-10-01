import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BearEncounter, bearRoutine, normalizeBearBites, BEAR_MAX_BITES } from '../src/bear.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { hospitalPlace } from '../src/hospital.ts';
import { walkingRoute, clearWalk } from '../src/navigation.ts';
import { missions } from '../src/missions.ts';

const visitor = (distance) => ({x: -88, z: -90.2 + distance, moving: false, running: false, sneaking: false});
const dry = () => true;

test('the overlook is safe; a warning gives time to retreat', () => {
  const bear = new BearEncounter();
  for (let t = 0; t < 10; t += 0.05) assert.equal(bear.advance(t, 0.05, visitor(24), dry).bite, false);
  assert.equal(bear.mood, 'calm');
  assert.equal(bear.advance(10, 0.05, visitor(17), dry).warning, true);
  assert.equal(bear.mood, 'warning');
  bear.advance(11, 0.05, visitor(30), dry);
  assert.equal(bear.mood, 'calm');
  assert.equal(bear.bites, 0);
});

test('lingering inside 20 metres or approaching within 10 triggers a charge, even sneaking', () => {
  const bear = new BearEncounter();
  bear.advance(0, 0.05, visitor(17), dry);
  bear.advance(2.4, 0.05, visitor(17), dry); assert.equal(bear.mood, 'warning');
  bear.advance(2.5, 0.05, visitor(17), dry); assert.equal(bear.mood, 'charging');
  const close = new BearEncounter(); close.advance(0, 0.05, {...visitor(8), sneaking: true}, dry);
  assert.equal(close.mood, 'charging');
});

test('bites have a cooldown and the fourth bite causes a knockout', () => {
  const bear = new BearEncounter(), bites = [];
  for (let t = 0; t <= 6; t += 0.05) {
    const event = bear.advance(t, 0.05, visitor(1), dry);
    if (event.bite) bites.push({time: t, ...event});
    if (event.knockedOut) break;
  }
  assert.equal(bites.length, BEAR_MAX_BITES);
  assert.deepEqual(bites.map(b => b.knockedOut), [false, false, false, true]);
  for (let i = 1; i < bites.length; i++) assert.ok(bites[i].time - bites[i-1].time >= 1.5);
  bear.reset(); assert.equal(bear.bites, 0); assert.equal(bear.mood, 'calm');
});

test('a running player can escape; the bear stays near its clearing and damage recovers safely', () => {
  const bear = new BearEncounter(); bear.advance(0, 0.05, visitor(1), dry);
  for (let t = 0.05; t < 10; t += 0.05) bear.advance(t, 0.05, {...visitor(1 + t * 8), running: true}, dry);
  assert.equal(bear.bites, 1); assert.notEqual(bear.mood, 'charging');
  assert.ok(Math.hypot(bear.pose(10).x + 88, bear.pose(10).z + 91) < 33);
  assert.equal(bear.advance(31, 0.05, visitor(90), dry).recovered, true);
  assert.equal(bear.bites, 0);
});

test('the bear cannot move through blocked ground or teleport on a stalled frame', () => {
  const bear = new BearEncounter(), start = bearRoutine(0);
  bear.advance(0, 100, visitor(8), () => false);
  assert.equal(bear.pose(0).x, start.x); assert.equal(bear.pose(0).z, start.z);
  bear.advance(1, 100, visitor(8), dry);
  assert.ok(Math.hypot(bear.pose(1).x - start.x, bear.pose(1).z - start.z) <= 0.316);
});

test('rendering samples cannot advance aggression, damage, or the live bear position', () => {
  const world = createWorld(), mission = missions.find(m => m.id === 'nature-bear');
  world.bearEncounter.advance(0, 0.05, visitor(8), world.canWalk);
  world.update(1, {filter: 'none', shutter: 1/500}); world.scene.updateMatrixWorld(true);
  const position = subjectPosition(world, mission).toArray();
  for (const t of [-10, 100, 3]) world.update(t, {filter: 'none', shutter: 1/500});
  world.update(1, {filter: 'none', shutter: 1/500}); world.scene.updateMatrixWorld(true);
  assert.deepEqual(subjectPosition(world, mission).toArray(), position);
  assert.equal(world.bearEncounter.bites, 0); assert.equal(world.bearEncounter.mood, 'charging');
});

test('a barrier between the player and the bear prevents bites through it', () => {
  const bear = new BearEncounter();
  for (let t = 0; t < 6; t += 0.05) bear.advance(t, 0.05, visitor(1), (x,z) => z < -89.9 || z > -89.6);
  assert.equal(bear.bites, 0);
});

test('hospital recovery is beside a bed with a walkable exit and route back to town', () => {
  const world = createWorld(), p = hospitalPlace.recovery;
  assert.ok(world.scene.getObjectByName('willowbrook-hospital'));
  assert.equal(world.canWalk(...p), true);
  assert.equal(world.canWalk(...hospitalPlace.entrance), true);
  assert.equal(clearWalk(p, hospitalPlace.entrance, world.canWalk), true);
  const route = walkingRoute(hospitalPlace.entrance, [19,32], world.canWalk);
  assert.ok(route.length > 0);
  let from = hospitalPlace.entrance;
  for (const to of route) { assert.equal(clearWalk(from, to, world.canWalk), true); from = to; }
});

test('old saves and malformed injury counts load safely while valid bites persist', () => {
  for (const value of [undefined, null, -1, 4, 99, NaN, 1.2, '3']) assert.equal(normalizeBearBites(value), 0);
  for (const value of [0, 1, 2, 3]) assert.equal(new BearEncounter(value).bites, value);
});

test('the hospital footprint clears the full rendered roads and sidewalks', () => {
  const world = createWorld(); world.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(world.scene.getObjectByName('willowbrook-hospital'));
  const footprint = new THREE.Box2(new THREE.Vector2(bounds.min.x, bounds.min.z), new THREE.Vector2(bounds.max.x, bounds.max.z));
  for (const name of ['neighborhood-road', 'neighborhood-sidewalk', 'neighborhood-access-road', 'neighborhood-access-sidewalk']) {
    const road = world.scene.getObjectByName(name);
    assert.ok(road instanceof THREE.Mesh, `missing ${name}`);
    const vertices = road.geometry.getAttribute('position');
    // Each four-vertex strip spans one actual road segment, including both edges.
    for (let i = 0; i < vertices.count - 2; i += 2) {
      const segment = new THREE.Box2();
      for (let j = 0; j < 4; j++) {
        const p = new THREE.Vector3().fromBufferAttribute(vertices, i + j).applyMatrix4(road.matrixWorld);
        segment.expandByPoint(new THREE.Vector2(p.x, p.z));
      }
      assert.equal(footprint.intersectsBox(segment), false, `hospital overlaps ${name} segment ${i / 2}`);
    }
  }
});

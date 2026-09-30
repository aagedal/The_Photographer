import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DeerAwareness, movementSpeed } from '../src/wildlife.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { arrivalPosition } from '../src/opening.ts';
import { missions } from '../src/missions.ts';
import { assessPhoto } from '../src/photography.ts';
import { ViewfinderState } from '../src/camera-view.ts';
import { fovForFocal } from '../src/economy.ts';

const routine = { x: 0, z: 0, yaw: 0, walking: false };
const visitor = { x: 0, z: 12, moving: true, sneaking: false, running: false };
const dry = () => true;
const settings = { filter: 'none', shutter: 1/500 };

test('quiet approach preserves a calm deer; ordinary walking and running have different ranges', () => {
  const deer = new DeerAwareness();
  assert.equal(deer.advance(0, routine, {...visitor, sneaking: true}, dry), false);
  assert.equal(deer.mood(0), 'calm');
  assert.equal(deer.advance(1, routine, visitor, dry), true);
  assert.equal(deer.mood(1), 'fleeing');
  assert.equal(new DeerAwareness().advance(0, routine, {...visitor, z: 24}, dry), false);
  assert.equal(new DeerAwareness().advance(0, routine, {...visitor, z: 24, running: true}, dry), true);
  assert.equal(new DeerAwareness().advance(0, routine, {...visitor, moving: false}, dry), false);
  assert.equal(new DeerAwareness().advance(0, routine, {...visitor, z: 3, sneaking: true, moving: false}, dry), true);
});

test('sneaking always stays slow, even with Shift held', () => {
  assert.equal(movementSpeed(true, false), 1.5);
  assert.equal(movementSpeed(true, true), 1.5);
  assert.equal(movementSpeed(false, false), 4.5);
  assert.equal(movementSpeed(false, true), 8);
});

test('startled deer moves away continuously on dry ground and settles after a quiet retreat', () => {
  const deer = new DeerAwareness();
  const land = (x, z) => z > -15 && Math.abs(x) < 18;
  deer.advance(0, routine, visitor, land);
  assert.deepEqual(deer.pose(0, routine).x, routine.x);
  for (let time = 0; time < 5; time += 0.05) {
    const pose = deer.pose(time, routine);
    assert.equal(land(pose.x, pose.z), true);
    assert.ok(Math.hypot(pose.x - visitor.x, pose.z - visitor.z) >= 12);
  }
  const away = {...visitor, x: 60, moving: false};
  deer.advance(4, routine, away, land);
  assert.equal(deer.mood(4), 'startled');
  deer.advance(12, routine, away, land);
  assert.equal(deer.mood(12), 'returning');
  deer.advance(24, routine, away, land);
  assert.equal(deer.mood(24), 'calm');
  assert.deepEqual(deer.pose(24, routine), routine);
});

test('render samples do not advance awareness or its quiet recovery timer', () => {
  const world = createWorld(), deer = missions.find(m => m.id === 'intro-deer');
  world.setTime(17); world.update(10, settings); world.scene.updateMatrixWorld(true);
  const target = subjectPosition(world, deer);
  assert.equal(world.reactWildlife(10, { x: target.x, z: target.z + 12, moving: true, sneaking: false, running: false }), true);
  world.update(10.5, settings); world.scene.updateMatrixWorld(true);
  const before = subjectPosition(world, deer).toArray(), mood = world.deerMood(10.5);
  for (const offset of [-1, 2, 20]) world.update(10.5 + offset, settings);
  world.update(10.5, settings); world.scene.updateMatrixWorld(true);
  assert.deepEqual(subjectPosition(world, deer).toArray(), before);
  assert.equal(world.deerMood(10.5), mood);
});

test('a startled deer cannot complete the introductory photograph', () => {
  const deer = missions.find(m => m.id === 'intro-deer');
  const frame = {visible:true,occluded:false,centerOffset:0.1,distance:12};
  assert.equal(assessPhoto(deer,deer.recommended,frame).passed,true);
  const failed = assessPhoto(deer,deer.recommended,{...frame,wildlifeSpooked:true});
  assert.equal(failed.passed,false);
  assert.match(failed.feedback.find(f=>f.label==='An undisturbed subject').text,/C to sneak/);
});

test('the arrival dock connects to the western meadow on foot', () => {
  const world = createWorld();
  const route = [arrivalPosition, [8,84], [-28,70], [-38,48], [-48,39], [-64,58], [-61,53]];
  for (let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);
    for(let j=0;j<=steps;j++) {
      const x=a[0]+(b[0]-a[0])*j/steps,z=a[1]+(b[1]-a[1])*j/steps;
      assert.equal(world.canWalk(x,z),true,`route blocked at ${x},${z}`);
    }
  }
});

test('exploration uses a wide view independently of the equipped lens', () => {
  const state = new ViewfinderState();
  for(const lens of [35,120,600]) assert.equal(state.fov(lens,16/9),fovForFocal(24,16/9));
  state.request(true,true);
  for(const lens of [35,120,600]) assert.ok(Math.abs(state.fov(lens,16/9)-fovForFocal(lens,16/9))<1e-10);
});

test('camera raising and lowering can reverse smoothly and reduced motion is immediate', () => {
  const state = new ViewfinderState();
  state.request(true); state.update(0.12);
  assert.equal(state.progress,0.5);
  const middle = state.fov(600,1.5);
  assert.ok(middle > fovForFocal(600,1.5) && middle < fovForFocal(24,1.5));
  state.request(false); state.update(0.09); assert.equal(state.progress,0);
  state.request(true); state.update(-1); assert.equal(state.progress,0);
  state.request(true,true); assert.equal(state.transitioning,false); assert.equal(state.progress,1);
  state.request(false,true); assert.equal(state.progress,0);
});

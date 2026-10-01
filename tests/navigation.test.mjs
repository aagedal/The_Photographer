import test from 'node:test';
import assert from 'node:assert/strict';
import { walkingRoute, clearWalk, routeDistance, relativeBearing } from '../src/navigation.ts';
import { createWorld } from '../src/world.ts';
import { missions } from '../src/missions.ts';
import { shotMission } from '../src/photo-series.ts';
import { regionalLandmarks } from '../src/landmarks.ts';
import { arrivalPosition } from '../src/opening.ts';
import { galleryPlace, unclePlace, paperPlace, boundaryPlace } from '../src/story-world.ts';
import { workshopPlace } from '../src/harbor.ts';
import { cameraStore } from '../src/camera-store.ts';

test('routes detour around obstacles without cutting corners or crossing thin barriers', () => {
  const canWalk = (x,z) => Math.abs(x) <= 20 && Math.abs(z) <= 20 && !(Math.abs(x) < 2.1 && Math.abs(z) < 9);
  const start = [-10,0], goal = [10,0], route = walkingRoute(start,goal,canWalk,20);
  assert.ok(route.length > 1);
  assert.ok(routeDistance(start,route) > 20);
  for (let i=0;i<route.length;i++) assert.ok(clearWalk(i ? route[i-1] : start,route[i],canWalk));
  assert.deepEqual(route.at(-1),goal);
  assert.equal(clearWalk([-1,0],[1,0], x=>Math.abs(x)>0.1),false);
});

test('disconnected and invalid destinations fail without inventing a route', () => {
  const canWalk = (x,z) => Math.abs(x)<=10 && Math.abs(z)<=10 && Math.abs(x)>1;
  assert.deepEqual(walkingRoute([-5,0],[5,0],canWalk,10),[]);
  assert.deepEqual(walkingRoute([-5,0],[0,0],canWalk,10),[]);
  assert.deepEqual(walkingRoute([NaN,0],[5,0],canWalk,10),[]);
  assert.deepEqual(walkingRoute([-5,0],[5,0],canWalk,0),[]);
});

test('bearings follow the exploration camera including wrapped turns', () => {
  assert.equal(relativeBearing([0,0],[0,-10],0),0);
  assert.equal(relativeBearing([0,0],[10,0],0),Math.PI/2);
  assert.equal(relativeBearing([0,0],[-10,0],0),-Math.PI/2);
  assert.ok(Math.abs(relativeBearing([0,0],[10,0],-Math.PI/2))<1e-9);
  assert.ok(Math.abs(relativeBearing([0,0],[0,-10],Math.PI*4))<1e-9);
  assert.equal(routeDistance([0,0],[[3,4],[6,8]]),10);
});

test('every assignment view and public entrance has a collision-safe route from the ferry', () => {
  const world = createWorld();
  const destinations = missions.flatMap(m => [m,...(m.shots ?? []).map(shot=>shotMission(m,shot))]).map(m=>({name:m.title,point:[m.viewpoint[0],m.viewpoint[2]]}));
  for (const p of [...regionalLandmarks,galleryPlace,unclePlace,paperPlace,boundaryPlace,workshopPlace,cameraStore]) destinations.push({name:p.name,point:p.entrance});
  for (const {name,point} of destinations) {
    const route = walkingRoute(arrivalPosition,point,world.canWalk);
    assert.ok(route.length,`${name}: route exists`);
    assert.deepEqual(route.at(-1),point,`${name}: exact destination`);
    for (let i=0;i<route.length;i++) assert.ok(clearWalk(i ? route[i-1] : arrivalPosition,route[i],world.canWalk),`${name}: clear segment ${i}`);
    // Rebuild after a reload or a detour from an intermediate point.
    assert.ok(walkingRoute(route[0],point,world.canWalk).length,`${name}: resume route`);
  }
});

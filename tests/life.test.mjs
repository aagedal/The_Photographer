import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { npcCatalog, nearestNPC } from '../src/exploration.ts';
import { DAY_SECONDS } from '../src/environment.ts';
import { ambientLevels, localPose, isActiveHour, routinePose, routePose, townRoad, routeLength } from '../src/life.ts';
import { coastline, terrainHeight } from '../src/terrain.ts';

const settings={filter:'none',shutter:1/125};
test('local routines move by day, rest at their anchors, and the astronomer works across midnight',()=>{
  assert.equal(isActiveHour(23,18,6),true);assert.equal(isActiveHour(6,18,6),false);
  assert.equal(localPose('ranger',12.01).walking,true);
  assert.notDeepEqual(localPose('ranger',12.01),localPose('ranger',12.02));
  assert.equal(localPose('ranger',23).walking,false);
  assert.equal(localPose('astronomer',12).walking,false);
  assert.equal(localPose('astronomer',23.05).walking,true);
  const route=[[0,0],[0,10],[10,10],[0,0]];
  for (const boundary of [7,21]) {
    const before=routinePose(route,boundary-0.00001),after=routinePose(route,boundary+0.00001);
    assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<0.005,'routine must return home without teleporting');
  }
  assert.deepEqual(routePose(townRoad,0),routePose(townRoad,routeLength(townRoad)));
});

test('roaming locals stay on dry walkable ground; talk proximity and markers follow their bodies',()=>{
  const world=createWorld();
  for(let hour=0;hour<24;hour+=0.125) {
    world.setTime(hour);world.update(hour*DAY_SECONDS/24,settings);world.scene.updateMatrixWorld(true);
    for(const npc of npcCatalog) {
      const [x,y,z]=world.npcPosition(npc.id);
      assert.equal(world.canWalk(x,z),true,`${npc.id} walks through a blocker at ${hour}: ${x},${z}`);
      assert.equal(nearestNPC(x,y+1.7,z,n=>world.npcPosition(n.id))?.id,npc.id);
      const marker=world.scene.getObjectByName(`npc-marker-${npc.id}`).getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(marker.x-x)<0.001&&Math.abs(marker.z-z)<0.001,'marker does not follow local');
    }
  }
});

test('traffic, residents, lights and wildlife follow the clock and parked cars are solid',()=>{
  const world=createWorld();world.setTime(12);world.update(10,settings);world.scene.updateMatrixWorld(true);
  assert.equal(world.traffic.filter(car=>car.visible).length,3);
  assert.equal(world.scene.getObjectByName('resident-0').visible,true);
  assert.equal(world.scene.getObjectByName('woodland-fox').visible,false);
  const car=world.traffic[0];assert.equal(world.canWalk(car.position.x,car.position.z),false);
  assert.ok(world.solids.some(mesh=>mesh.parent===car),'active traffic participates in photo obstruction');
  const dayLights=[];world.scene.traverse(o=>{if(o instanceof THREE.PointLight) dayLights.push(o.intensity);});
  world.setTime(23);world.update(10,settings);world.scene.updateMatrixWorld(true);
  assert.equal(world.traffic.filter(car=>car.visible).length,1);
  assert.equal(world.scene.getObjectByName('resident-0').visible,false);
  assert.equal(world.scene.getObjectByName('woodland-fox').visible,true);
  const parked=world.scene.getObjectByName('parked-car-0');assert.equal(parked.visible,true);
  assert.equal(world.canWalk(parked.position.x,parked.position.z),false);
  const nightLights=[];world.scene.traverse(o=>{if(o instanceof THREE.PointLight) nightLights.push(o.intensity);});
  assert.ok(nightLights.reduce((a,b)=>a+b,0)>dayLights.reduce((a,b)=>a+b,0)+50);
  assert.equal(world.solids.some(mesh=>mesh.parent===world.traffic[1]),false,'sleeping traffic leaves no invisible photo blocker');
});

test('exposure sampling and clock skips restore all new actors and collision geometry exactly',()=>{
  const world=createWorld();
  const snapshot=()=>{
    const state=[];world.scene.traverse(o=>{if(o.name.startsWith('npc-')||/resident|car-|van|duck|deer|fox|seagull/.test(o.name)) state.push([o.name,o.visible,...o.position.toArray(),...o.rotation.toArray()]);});
    return {state,solids:world.solids.map(o=>o.uuid)};
  };
  world.setTime(12.123);world.update(25,settings);const before=snapshot();
  for(const offset of [-15,-1,0.5,15]) world.update(25+offset,settings,12.123+offset*24/DAY_SECONDS);
  world.setTime(23);world.update(70,settings);
  world.setTime(12.123);world.update(25,settings);
  assert.deepEqual(snapshot(),before);
  assert.equal(new Set(world.solids).size,world.solids.length,'dynamic solids accumulate across frames');
});

test('new streets, chapel aisle, beach path and coast agree with walking boundaries',()=>{
  const world=createWorld();
  for(let distance=0;distance<routeLength(townRoad);distance+=0.8) {
    const p=routePose(townRoad,distance);assert.equal(world.canWalk(p.x,p.z),true,`street obstructed at ${p.x},${p.z}`);
  }
  for(let z=17;z<37;z++) assert.equal(world.canWalk(48,z),true);
  for(let z=14;z<=35;z++) assert.equal(world.canWalk(-43,z),true,`chapel aisle blocked at ${z}`);
  assert.equal(world.canWalk(-43,-20),true);
  assert.equal(world.canWalk(-47.3,16),false);
  for(let z=66;z<95;z++) assert.equal(world.canWalk(49+(z-66)*0.3,z),true,`beach path blocked at ${z}`);
  for(let x=-120;x<=120;x+=10) {
    assert.equal(world.canWalk(x,coastline(x)-3),true);
    assert.equal(world.canWalk(x,coastline(x)+2),false);
    assert.ok(terrainHeight(x,coastline(x)+6)<0,'ocean bed above water');
  }
});

test('ambient sounds respond to listener location and daylight',()=>{
  assert.ok(ambientLevels(12,-26,-12).water>ambientLevels(12,100,60).water*10);
  assert.ok(ambientLevels(12,57,98).ocean>ambientLevels(12,0,0).ocean*10);
  assert.equal(ambientLevels(12,0,0).crickets,0);
  assert.equal(ambientLevels(23,0,0).birds,0);
  assert.ok(ambientLevels(23,0,0).crickets>0);
});

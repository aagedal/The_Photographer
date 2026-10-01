import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { terrainHeight, distanceToTrail } from '../src/terrain.ts';
const settings={filter:'none',shutter:1/125};

test('ambient vegetation leaves trails clear and rabbits remain on dry walkable ground',()=>{
  const world=createWorld(),grass=world.scene.getObjectByName('wind-meadow-grass'),matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  assert.ok(grass.count>=5000);
  for(let i=0;i<grass.count;i++){grass.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);assert.ok(distanceToTrail(position.x,position.z)>2.59);assert.ok(terrainHeight(position.x,position.z)>=0);}
  for(let time=0;time<120;time+=0.7){world.setTime(15);world.update(time,settings);for(let i=0;i<7;i++){const rabbit=world.scene.getObjectByName(`meadow-rabbit-${i}`);assert.ok(world.canWalk(rabbit.position.x,rabbit.position.z),`rabbit ${i} leaves dry ground`);assert.ok(rabbit.position.y>=terrainHeight(rabbit.position.x,rabbit.position.z)-0.001);}}
});

test('all villagers, portrait subjects, Arthur, harbor crew and arrival Mara have moving head and torso joints',()=>{
  const world=createWorld();world.setTime(15);world.update(24,settings);world.opening.update(new THREE.PerspectiveCamera(),1,24,false);
  const heads=[];world.scene.traverse(object=>{if(object.name==='idle-head') heads.push(object);});
  assert.ok(heads.length>=32,'all original characters retain their idle joints as the cast grows');
  const before=heads.map(head=>head.rotation.toArray());
  world.update(29,settings);world.opening.update(new THREE.PerspectiveCamera(),1,29,false);
  heads.forEach((head,i)=>assert.notDeepEqual(head.rotation.toArray(),before[i]));
});

test('nature follows daylight and every animated transform restores after temporal photo sampling',()=>{
  const world=createWorld();
  const snapshot=()=>{const objects=[];world.scene.traverse(o=>{if(o.name==='idle-head'||o.name==='idle-torso'||/sky-bird|meadow-rabbit|garden-butterfly/.test(o.name)) objects.push([o.name,o.visible,...o.position.toArray(),...o.rotation.toArray(),...o.scale.toArray()]);});return {objects,fireflies:Array.from(world.scene.getObjectByName('evening-fireflies').geometry.attributes.position.array)};};
  world.setTime(15);world.update(24,settings);const before=snapshot();
  assert.equal(world.scene.getObjectByName('sky-bird-0').visible,true);assert.equal(world.scene.getObjectByName('garden-butterfly-0').visible,true);assert.equal(world.scene.getObjectByName('evening-fireflies').visible,false);
  for(const t of [23.5,24.5,60])world.update(t,settings);
  world.setTime(23);world.update(90,settings);assert.equal(world.scene.getObjectByName('sky-bird-0').visible,false);assert.equal(world.scene.getObjectByName('meadow-rabbit-0').visible,false);assert.equal(world.scene.getObjectByName('garden-butterfly-0').visible,false);assert.equal(world.scene.getObjectByName('evening-fireflies').visible,true);
  world.setTime(15);world.update(24,settings);assert.deepEqual(snapshot(),before);
});

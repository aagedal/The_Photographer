import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorld} from '../src/world.ts';
import {terrainHeight,terrainSurfaceHeight} from '../src/terrain.ts';
import {galleryPlace,unclePlace,hospitalPlace,woodlandCabins} from '../src/world-layout.ts';
import {walkingRoute,clearWalk} from '../src/navigation.ts';
import {arrivalPosition} from '../src/opening.ts';
import {missions} from '../src/missions.ts';
import {exhibitionVisitorCount} from '../src/gallery-visitors.ts';
const settings={filter:'none',shutter:1/125};
const prints=missions.map((m,i)=>({photoId:`print-${i}`,missionId:m.id,image:''}));

test('key floors and approaches sit on level rendered terrain and have routes from the ferry',()=>{
  const world=createWorld();
  for(const [place,w,d] of [[galleryPlace,12,12],[unclePlace,6,4],[hospitalPlace,9,7],...woodlandCabins.map(c=>[c,7,7])]){
    const level=terrainHeight(place.x,place.z);
    for(let x=-w/2;x<=w/2;x+=0.5)for(let z=-d/2;z<=d/2;z+=0.5){
      assert.ok(Math.abs(terrainHeight(place.x+x,place.z+z)-level)<0.001,`${place.name}: uneven floor`);
      assert.ok(Math.abs(terrainSurfaceHeight(place.x+x,place.z+z)-level+0.055)<0.001,`${place.name}: terrain triangles leave a gap`);
    }
    assert.ok(Math.abs(terrainHeight(...place.entrance)-level)<0.001,`${place.name}: entrance is on a slope`);
    const route=walkingRoute(arrivalPosition,place.entrance,world.canWalk);assert.ok(route.length,place.name);
    for(let i=0;i<route.length;i++)assert.ok(clearWalk(i?route[i-1]:arrivalPosition,route[i],world.canWalk));
  }
  assert.ok(galleryPlace.z<-20,'gallery is inland of the arrival neighborhood');
});

test('exhibitions grow a bounded audience, discuss displayed photos and restore after shutter sampling and reload',()=>{
  const world=createWorld(),crowd=world.galleryVisitors;
  assert.equal(exhibitionVisitorCount(true,4),0);assert.equal(exhibitionVisitorCount(false,23),0);
  crowd.setExhibition(false,prints);assert.equal(crowd.count,0);
  for(let count=5;count<=prints.length;count++){
    crowd.setExhibition(true,prints.slice(0,count));world.setTime(14);world.update(24,settings);world.scene.updateMatrixWorld(true);
    assert.equal(crowd.count,Math.min(12,count));
    assert.equal(world.scene.getObjectByName('willowbrook-gallery').children.filter(o=>o.name.startsWith('gallery-visitor')&&o.visible).length,crowd.count);
  }
  world.storyPlaces.displayPrints(prints);
  assert.ok(world.storyPlaces.frames.length>=prints.length);
  world.storyPlaces.frames.slice(0,prints.length).forEach((f,i)=>assert.equal(f.userData.photoId,prints[i].photoId));
  const visitor=world.scene.getObjectByName('gallery-visitor-0'),p=visitor.getWorldPosition(new THREE.Vector3());
  assert.ok(world.canWalk(p.x,p.z));
  const comment=crowd.nearest(p.x,p.y+1.7,p.z);assert.ok(comment);assert.ok(prints.includes(comment.print));
  assert.ok(comment.comment.includes(missions.find(m=>m.id===comment.print.missionId).title));
  const snapshot=()=>{const list=[];world.scene.traverse(o=>{if(o.name.startsWith('gallery-visitor')||o.name==='visitor-comment')list.push([o.name,o.visible,...o.position.toArray(),...o.rotation.toArray()]);});return list;};
  const before=snapshot();world.update(23.5,settings);world.update(24.5,settings);world.update(24,settings);assert.deepEqual(snapshot(),before);
  crowd.setExhibition(true,prints,2);crowd.setExhibition(true,prints,1);world.update(24,settings);assert.deepEqual(crowd.nearest(p.x,p.y+1.7,p.z)?.comment,comment.comment);
  crowd.setExhibition(false,prints);assert.equal(crowd.nearest(p.x,p.y+1.7,p.z),undefined);
});

test('woodland shelters have walkable interiors and nearby wildlife stays on dry ground',()=>{
  const world=createWorld();
  for(const cabin of woodlandCabins){
    assert.ok(world.scene.getObjectByName(cabin.id));
    assert.ok(clearWalk(cabin.entrance,[cabin.x,cabin.z],world.canWalk));
    assert.ok(world.groundHeight(cabin.x,cabin.z)>terrainHeight(cabin.x,cabin.z));
    assert.ok(cabin.note.length>80);
  }
  for(let hour=0;hour<24;hour+=0.25){world.setTime(hour);world.update(hour*75,settings);for(const name of ['ridge-deer-0','ridge-deer-1','birch-hollow-fox',...Array.from({length:6},(_,i)=>`meadow-rabbit-${i+7}`)]){
    const animal=world.scene.getObjectByName(name);assert.ok(animal);
    assert.ok(world.canWalk(animal.position.x,animal.position.z),name);
    assert.ok(animal.position.y>=terrainHeight(animal.position.x,animal.position.z)-0.001,name);
  }}
});

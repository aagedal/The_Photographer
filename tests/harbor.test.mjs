import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { freshStory, normalizeStory, meetWorkshop, shareWorkshop, workshopDialogue, workshopMissionIds, storyMissionUnlocked, storyDiscoveries, storyObjective, printPhoto } from '../src/story.ts';
import { normalizeEconomy, fovForFocal, balance, completeMission } from '../src/economy.ts';
import { missions } from '../src/missions.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { workshopPlace } from '../src/harbor.ts';
import { nearStoryPlace } from '../src/story-world.ts';
import { contextInFrame } from '../src/framing.ts';
import { assessPhoto } from '../src/photography.ts';
import { trails } from '../src/terrain.ts';
const main = ['intro-deer','wedding-1','wedding-2','sports-1','news-townhall','news-boundary'];
const photo = id => ({id:`photo-${id}`,missionId:id,image:'data:image/jpeg;base64,abc',result:{passed:true}});

test('harbor stories require meeting Ruth, reinforce June’s investigation, and leave Arthur’s route open', () => {
  const fresh = freshStory();
  assert.deepEqual(meetWorkshop(fresh),fresh);
  assert.equal(storyMissionUnlocked('harbor-portrait',fresh,[]),false);
  let story = {...fresh,deerShown:true};
  assert.equal(storyMissionUnlocked('harbor-portrait',story,main),false);
  story = meetWorkshop(story);
  assert.equal(storyMissionUnlocked('harbor-portrait',story,main),true);
  assert.equal(storyMissionUnlocked('harbor-crew',story,[...main,'harbor-portrait']),false);
  assert.ok(storyDiscoveries(story,main,[]).includes('harbor-portrait'));
  assert.ok(!storyDiscoveries(story,main,[]).includes('harbor-crew'));
  story = {...story,reportPublished:true};
  assert.equal(storyMissionUnlocked('harbor-crew',story,main),false);
  assert.equal(storyMissionUnlocked('harbor-crew',story,[...main,'harbor-portrait']),true);
  assert.equal(storyObjective(story,main).missionId,'nature-bear');
  assert.equal(storyMissionUnlocked('nature-bear',{...story,workshopMet:false},main),true);
  assert.match(workshopDialogue(story,[...main,'harbor-portrait']),/needs checking/);
});

test('sharing requires two retained prints, pays no bonus, and survives journal loss and repeated reloads', () => {
  const completed = [...main,...workshopMissionIds];
  let story = meetWorkshop({...freshStory(),deerShown:true,reportPublished:true});
  let economy = normalizeEconomy(undefined,completed);
  assert.deepEqual(shareWorkshop(story),story,'completed captures are not a handoff');
  for (const id of workshopMissionIds) {
    const result = printPhoto(story,economy,completed,photo(id)); assert.equal(result.ok,true);
    story=result.story;economy=result.economy;
    if (story.prints.length===1) assert.deepEqual(shareWorkshop(story),story);
  }
  const cash=balance(economy,completed); story=shareWorkshop(story);
  assert.equal(story.workshopShared,true); assert.equal(balance(economy,completed),cash);
  assert.deepEqual(shareWorkshop(story),story);
  for(let i=0;i<3;i++) story=normalizeStory(JSON.parse(JSON.stringify(story)),completed);
  assert.equal(story.workshopShared,true); assert.equal(story.prints.length,2);
  assert.equal(normalizeStory({...story,prints:story.prints.slice(0,1)},completed).workshopShared,false);
  assert.equal(normalizeStory({...story,reportPublished:false},completed).workshopShared,false);
  assert.equal(normalizeStory({...freshStory(),workshopShared:true},[]).workshopShared,false);
  assert.equal(normalizeStory({version:1,deerShown:true},main).workshopMet,false);
  assert.equal(completeMission(completed,'harbor-crew',true).payment,0);
  assert.match(workshopDialogue(story,completed),/cost it/);
});

test('environmental portraits reject missing context, long lenses, shallow depth and a slow shutter', () => {
  const frame={visible:true,distance:10,centerOffset:0,occluded:false,contextVisible:true};
  const light={ambientEV:12,subjectStops:0};
  for(const m of missions.filter(m=>workshopMissionIds.includes(m.id))) {
    assert.equal(assessPhoto(m,m.recommended,frame,light).passed,true);
    assert.equal(assessPhoto(m,m.recommended,{...frame,contextVisible:false},light).passed,false);
    assert.equal(assessPhoto(m,m.recommended,{...frame,contextVisible:undefined},light).passed,false);
    for(const change of [{focalLength:120},{aperture:2.8},{shutter:1/30}]) assert.equal(assessPhoto(m,{...m.recommended,...change},frame,light).passed,false);
  }
});

test('both viewpoints contain people and the full boat across sensor crops and actor animation', () => {
  const world=createWorld();
  for(const m of missions.filter(m=>workshopMissionIds.includes(m.id))) for(const aspect of [0.55,1.5,2.4]) {
    const camera=new THREE.PerspectiveCamera(fovForFocal(35,aspect),aspect,0.1,1000);
    camera.position.set(m.viewpoint[0],world.groundHeight(m.viewpoint[0],m.viewpoint[2])+1.7,m.viewpoint[2]);
    for(const time of [0,17,200]) {
      world.update(time,m.recommended);world.scene.updateMatrixWorld(true);
      camera.lookAt(subjectPosition(world,m));camera.updateMatrixWorld(true);
      assert.equal(contextInFrame(world.subjects,world.solids,m,camera,35),true,`${m.id}, ${aspect}, ${time}`);
    }
    assert.equal(contextInFrame(world.subjects,world.solids,m,camera,120),false,'a tight headshot leaves out the work');
  }
});

test('context checks reject a hidden apprentice, missing boat, obstruction and a face outside the sensor crop', () => {
  const world=createWorld(),m=missions.find(m=>m.id==='harbor-crew');
  world.update(0,m.recommended);world.scene.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(fovForFocal(35,1.5),1.5,0.1,1000);
  camera.position.set(m.viewpoint[0],world.groundHeight(m.viewpoint[0],m.viewpoint[2])+1.7,m.viewpoint[2]);camera.lookAt(subjectPosition(world,m));camera.updateMatrixWorld(true);
  const kit=world.subjects.get('Kit the apprentice');
  kit.parent.visible=false;assert.equal(contextInFrame(world.subjects,world.solids,m,camera,35),false);kit.parent.visible=true;
  const boat=world.subjects.get('Unfinished harbor boat');world.subjects.delete('Unfinished harbor boat');assert.equal(contextInFrame(world.subjects,world.solids,m,camera,35),false);world.subjects.set('Unfinished harbor boat',boat);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(12,4,0.2),new THREE.MeshBasicMaterial());wall.position.set(45,2,78);world.scene.add(wall);world.scene.updateMatrixWorld(true);
  assert.equal(contextInFrame(world.subjects,[...world.solids,wall],m,camera,35),false);
  camera.lookAt(40,3,84);camera.updateMatrixWorld(true);assert.equal(contextInFrame(world.subjects,world.solids,m,camera,35),false);
});

test('the harbor paths reach the workshop and ferry, and the working hull remains solid', () => {
  const world=createWorld(),[x,z]=workshopPlace.entrance;
  assert.equal(world.canWalk(x,z),true);assert.equal(nearStoryPlace(workshopPlace,x,world.groundHeight(x,z)+1.7,z),true);
  assert.equal(world.canWalk(47,86),false,'the raised hull is not a route through the yard');
  for(const trail of trails.slice(-2)) for(let i=1;i<trail.length;i++) {
    const a=trail[i-1],b=trail[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
    for(let j=0;j<=steps;j++) for(const offset of [-0.4,0,0.4]) {
      const x=a[0]+(b[0]-a[0])*j/steps+offset,z=a[1]+(b[1]-a[1])*j/steps;
      assert.equal(world.canWalk(x,z),true,`harbor path at ${x}, ${z}`);
    }
  }
  assert.ok(world.scene.getObjectByName('tidewright-hearing-board'));
  for(const shared of [true,false]){world.harbor.setShared(shared);world.storyPlaces.setReportPublished(true,shared);assert.equal(world.canWalk(x,z),true);}
  const kit=world.scene.getObjectByName('kit-apprentice');world.update(17,{filter:'none',shutter:1/125});const pose=kit.rotation.y;world.update(20,{filter:'none',shutter:1/125});world.update(17,{filter:'none',shutter:1/125});assert.equal(kit.rotation.y,pose);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { freshStory, receiveArthurCamera, normalizeStory, storyMissionUnlocked, storyDiscoveries, storyObjective, printPhoto, visitUncle, startExhibition, settleDays, buyCottage, publishReport, rememberArthur, arthurMemories, localStoryDialogue } from '../src/story.ts';
import { normalizeEconomy, balance, purchaseGear, completeMission } from '../src/economy.ts';
import { missions } from '../src/missions.ts';
import { assessPhoto } from '../src/photography.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { galleryPlace, unclePlace, paperPlace, boundaryPlace, nearStoryPlace } from '../src/story-world.ts';
const photo = (id, passed = true) => ({id:`photo-${id}`,missionId:id,image:'data:image/jpeg;base64,abc',result:{passed}});
const emptyKit = () => normalizeEconomy(undefined, []);

test('the complete story requires a deer print, town reputation, safe bear photography, and a visit home', () => {
  let story = freshStory(), economy = emptyKit(), completed = [];
  const all = missions.map(m=>m.id);
  assert.equal(storyObjective(story, completed).action, 'uncle');
  assert.deepEqual(storyDiscoveries(story, completed, all), []);
  assert.equal(storyMissionUnlocked('intro-deer', story, completed), false);
  story = receiveArthurCamera(story);
  assert.deepEqual(receiveArthurCamera(story), story);
  assert.deepEqual(storyDiscoveries(story, completed, all), ['intro-deer']);
  assert.equal(storyObjective(story,completed).missionId,'intro-deer');
  completed.push('intro-deer');
  assert.equal(storyObjective(story,completed).action,'gallery');
  assert.equal(storyMissionUnlocked('wedding-1',story,completed),false);
  assert.deepEqual(visitUncle(story,completed),story);
  let result = printPhoto(story,economy,completed,photo('intro-deer'));
  assert.equal(result.ok,true); story=result.story; economy=result.economy;
  assert.equal(balance(economy,completed),0);
  assert.equal(storyMissionUnlocked('wedding-1',story,completed),false,'printing alone does not skip Arthur');
  story=visitUncle(story,completed);
  assert.equal(storyObjective(story,completed).missionId,'wedding-1');
  assert.equal(storyMissionUnlocked('sports-1',story,completed),false);
  completed.push('wedding-1'); assert.equal(storyObjective(story,completed).missionId,'wedding-2');
  completed.push('wedding-2'); assert.equal(storyObjective(story,completed).missionId,'sports-1');
  assert.equal(storyMissionUnlocked('news-townhall',story,completed),false);
  completed.push('sports-1'); assert.equal(storyObjective(story,completed).missionId,'news-townhall');
  assert.equal(storyMissionUnlocked('nature-bear',story,completed),false);
  completed.push('news-townhall'); assert.equal(storyObjective(story,completed).missionId,'news-boundary');
  assert.equal(storyMissionUnlocked('nature-bear',story,completed),false);
  assert.deepEqual(publishReport(story,completed),story,'a meeting alone is not enough');
  completed.push('news-boundary'); assert.equal(storyObjective(story,completed).action,'editor');
  assert.equal(storyMissionUnlocked('nature-bear',story,completed),false,'take the evidence to June');
  story=publishReport(story,completed);
  assert.equal(storyObjective(story,completed).missionId,'nature-bear');
  const bought = purchaseGear(economy,completed,'telephoto');
  assert.equal(bought.ok,true,'main commissions alone fund the required lens and CPL'); economy=bought.economy;
  assert.equal(purchaseGear(economy,completed,'cpl').ok,true);
  completed.push('nature-bear'); assert.equal(storyObjective(story,completed).action,'uncle');
  assert.equal(visitUncle(story,completed).reconciled,false,'a capture is not the ending');
  result=printPhoto(story,economy,completed,photo('nature-bear')); story=result.story;
  story=visitUncle(story,completed); assert.equal(story.reconciled,true);
  assert.equal(storyObjective(story,completed).title,'A place to stay');
  assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(story)),completed),story);
});
test('side jobs unlock through story milestones and older discoveries remain accessible', () => {
  const fresh=freshStory();
  assert.equal(storyMissionUnlocked('studio-1',fresh,[]),false);
  assert.equal(storyMissionUnlocked('studio-1',{...fresh,deerShown:true},['intro-deer']),true);
  assert.equal(storyMissionUnlocked('astro-1',{...fresh,deerShown:true},['wedding-2']),true);
  const old=normalizeStory(undefined,['nature-1','sports-1'],['nature-1','studio-1']);
  assert.equal(old.deerShown,true);
  assert.equal(storyMissionUnlocked('studio-1',old,[]),true);
  assert.equal(storyMissionUnlocked('nature-bear',old,[]),false);
  const valid=normalizeStory(null,[],[]); assert.deepEqual(valid,fresh);
});
test('only successful distinct mission photographs can be printed and five open an exhibition', () => {
  const completed=['intro-deer','nature-1','wedding-1','wedding-2','sports-1'];
  let story=freshStory(), economy=emptyKit();
  assert.equal(printPhoto(story,economy,completed,photo('intro-deer',false)).ok,false);
  assert.equal(printPhoto(story,economy,[],photo('intro-deer')).ok,false);
  assert.equal(printPhoto(story,economy,[],photo('nature-1')).ok,false);
  for (const id of completed) {
    const result=printPhoto(story,economy,completed,photo(id)); assert.equal(result.ok,true);
    story=result.story; economy=result.economy;
    assert.equal(printPhoto(story,economy,completed,{...photo(id),id:'another-burst-frame'}).ok,false);
    if (story.prints.length<5) assert.equal(startExhibition(story).exhibition,false);
  }
  assert.equal(economy.living.printCosts,20);
  story=startExhibition(story); assert.equal(story.exhibition,true);
  assert.equal(startExhibition(story).prints.length,5);
  assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(story)),completed),story,'prints survive without journal photos');
  const restored=normalizeEconomy(JSON.parse(JSON.stringify(economy)),completed);
  assert.equal(balance(restored,completed),balance(economy,completed));
});
test('game-day income and rent settle once, stay idle on reload, and never make the wallet negative', () => {
  const completed=['nature-1'];
  const initial={...freshStory(),deerShown:true,exhibition:true};
  const result=settleDays(initial,emptyKit(),completed,3);
  assert.equal(result.income,15); assert.equal(result.rent,6); assert.equal(result.story.day,4);
  assert.equal(balance(result.economy,completed),129);
  assert.deepEqual(settleDays(result.story,result.economy,completed,0),{story:result.story,economy:result.economy,income:0,rent:0});
  const broke=settleDays({...freshStory(),deerShown:true},emptyKit(),[],2);
  assert.equal(balance(broke.economy,[]),0); assert.equal(broke.story.rentArrears,4);
  const recovered=settleDays(broke.story,broke.economy,completed,1);
  assert.equal(recovered.story.rentArrears,0); assert.equal(recovered.rent,6);
  assert.equal(settleDays(freshStory(),emptyKit(),[],2).story.rentArrears,0,'arrival has no rent');
  const normalized=normalizeStory({day:NaN,rentArrears:-4,exhibition:true,prints:[null]},[]);
  assert.equal(normalized.day,1); assert.equal(normalized.exhibition,false);
});
test('buying a cottage clears arrears once, removes rent, and all purchases survive reload', () => {
  const completed=['nature-1','wedding-1','wedding-2','sports-1','news-townhall'];
  const story={...freshStory(),deerShown:true,rentArrears:4};
  assert.equal(buyCottage(story,emptyKit(),[]).ok,false);
  let economy=purchaseGear(emptyKit(),completed,'cpl').economy;
  const bought=buyCottage(story,economy,completed); assert.equal(bought.ok,true);
  assert.equal(bought.story.home,'cottage'); assert.equal(bought.story.rentArrears,0);
  assert.equal(balance(bought.economy,completed),436);
  assert.equal(buyCottage(bought.story,bought.economy,completed).ok,false);
  assert.equal(settleDays(bought.story,bought.economy,completed,10).rent,0);
  assert.deepEqual(normalizeEconomy(JSON.parse(JSON.stringify(bought.economy)),completed),bought.economy);
});
test('the bear rejects close approaches, short lenses, blur and flash; meeting needs dark hours and CPL', () => {
  const bear=missions.find(m=>m.id==='nature-bear'), meeting=missions.find(m=>m.id==='news-townhall');
  const frame={visible:true,distance:28,centerOffset:0,occluded:false};
  const light={gearReady:true,ambientEV:12,subjectStops:0,hour:15};
  assert.equal(assessPhoto(bear,bear.recommended,frame,light).passed,true);
  assert.equal(assessPhoto(bear,bear.recommended,{...frame,distance:19},light).passed,false);
  for (const bad of [{focalLength:35},{shutter:1/60},{flashPower:0.25}]) assert.equal(assessPhoto(bear,{...bear.recommended,...bad},frame,light).passed,false);
  assert.equal(assessPhoto(bear,bear.recommended,frame,{...light,gearReady:false}).passed,false);
  assert.equal(assessPhoto(meeting,meeting.recommended,frame,{...light,hour:23}).passed,true);
  assert.equal(assessPhoto(meeting,meeting.recommended,frame,{...light,hour:12}).passed,false);
  assert.equal(assessPhoto(meeting,{...meeting.recommended,filter:'none'},frame,{...light,hour:23}).passed,false);
  assert.equal(assessPhoto(meeting,{...meeting.recommended,flashPower:0.25},frame,{...light,hour:23}).passed,false);
  assert.equal(completeMission(['news-townhall'],'news-townhall',true).payment,0);
});
test('gallery and uncle entrances are reachable and night windows reduce glare with CPL', () => {
  const world=createWorld();
  for (const place of [galleryPlace,unclePlace,paperPlace,boundaryPlace]) {
    const [x,z]=place.entrance,y=world.groundHeight(x,z)+1.7;
    assert.equal(world.canWalk(x,z),true,place.name);
    assert.equal(nearStoryPlace(place,x,y,z),true);
    assert.equal(nearStoryPlace(place,x,y+20,z),false);
  }
  const hall=world.scene.getObjectByName('townhall-reflection');
  world.setTime(23);world.update(12,{filter:'none',shutter:1/125});
  assert.equal(world.scene.getObjectByName('councillor-vale').visible,true);
  assert.equal(hall.material.uniforms.strength.value,0.6);
  world.update(12,{filter:'cpl',shutter:1/125});assert.equal(hall.material.uniforms.strength.value,0.06);
  const bear=missions.find(m=>m.id==='nature-bear');
  const position=subjectPosition(world,bear).toArray(); world.update(15,{filter:'none',shutter:1/125});world.update(12,{filter:'none',shutter:1/125});
  assert.deepEqual(subjectPosition(world,bear).toArray(),position);
  world.setTime(12);assert.equal(world.scene.getObjectByName('councillor-vale').visible,false);
});

test('previous notebooks keep their bear route across repeated migrations', () => {
  const completed = ['intro-deer','wedding-1','wedding-2','sports-1','news-townhall'];
  const original = { version:1, deerShown:true, legacyKnown:[] };
  let migrated = normalizeStory(original,completed,['nature-bear']);
  assert.equal(migrated.reportPublished,true);
  assert.equal(storyObjective(migrated,completed).missionId,'nature-bear');
  assert.equal(storyMissionUnlocked('nature-bear',migrated,completed),true);
  assert.ok(storyDiscoveries(migrated,completed,[]).includes('news-boundary'),'the expanded commission is optional for old notebooks');
  for (let i=0;i<3;i++) { migrated=normalizeStory(JSON.parse(JSON.stringify(migrated)),completed); assert.equal(migrated.reportPublished,true); }
  const fresh = normalizeStory({...freshStory(),deerShown:true,reportPublished:true},completed);
  assert.equal(fresh.reportPublished,false,'new notebooks require the corroborating photograph');
  assert.equal(storyObjective(fresh,completed).missionId,'news-boundary');
  assert.equal(normalizeStory({...original,deerShown:true},['intro-deer']).reportPublished,false);
});
test('Arthur memories are optional, deduplicated and persist without advancing commissions or finances', () => {
  let story = freshStory();
  for (const memory of arthurMemories) {
    story=rememberArthur(story,memory.id);
    assert.deepEqual(rememberArthur(story,memory.id),story);
    assert.equal(storyObjective(story,[]).action,'uncle');
  }
  assert.equal(story.memories.length,3);
  assert.equal(story.day,1); assert.equal(story.deerShown,false);
  assert.deepEqual(rememberArthur(story,'unknown'),story);
  assert.deepEqual(normalizeStory({...story,memories:[...story.memories,'unknown','bear',null]},[]),story);
  assert.match(localStoryDialogue('editor',{...story,reportPublished:true},[],''),/preliminary/);
  assert.match(localStoryDialogue('ranger',story,['news-townhall'],''),/orange ribbons/);
});
test('the investigation changes notices without closing the public trail or hiding the survey subject', () => {
  const world=createWorld(); const mission=missions.find(m=>m.id==='news-boundary');
  world.scene.updateMatrixWorld(true);
  const before=subjectPosition(world,mission).toArray();
  world.storyPlaces.setReportPublished(true);
  assert.deepEqual(subjectPosition(world,mission).toArray(),before);
  assert.ok(world.scene.getObjectByName('woodland-planning-notice'));
  assert.ok(world.scene.getObjectByName('willowbrook-paper-front-page'));
  const arthur=world.scene.getObjectByName('uncle-arthur');
  assert.ok(arthur); assert.ok(arthur.children.length<20,'rounded Arthur detail is batched');
  for (const published of [false,true]) {
    world.storyPlaces.setReportPublished(published);
    for (const place of [paperPlace,boundaryPlace]) assert.equal(world.canWalk(...place.entrance),true);
  }
});

test('old notebooks keep their camera while new arrivals and explicit pending handoffs stay pending', () => {
  assert.equal(normalizeStory({version:1},[]).cameraReceived,true);
  assert.equal(normalizeStory(undefined,['intro-deer']).cameraReceived,true);
  assert.equal(normalizeStory(freshStory(),[]).cameraReceived,false);
  assert.equal(normalizeStory(receiveArthurCamera(freshStory()),[]).cameraReceived,true);
});

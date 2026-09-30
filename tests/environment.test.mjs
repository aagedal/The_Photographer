import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldClock, DAY_SECONDS, sampleSky, isMissionTime, missionReferenceHour, missionAmbientEV, formatTime } from '../src/environment.ts';
import { missions } from '../src/missions.ts';
import { assessPhoto, exposureStops } from '../src/photography.ts';
import { createWorld } from '../src/world.ts';
const near = (a,b,tolerance=1e-9) => assert.ok(Math.abs(a-b)<tolerance, `${a} !== ${b}`);
const m = id => missions.find(m => m.id === id);

test('one world day is exactly thirty minutes, including midnight wrap', () => {
  assert.equal(DAY_SECONDS,1800);
  const clock = new WorldClock(17); clock.advance(450); near(clock.hour,23);
  clock.advance(450); near(clock.hour,5);
  clock.advance(900); near(clock.hour,17);
  clock.advance(-100); near(clock.hour,17);
  clock.advance(NaN); near(clock.hour,17);
});
test('meditation targets and saved clock values normalize without advancing offline', () => {
  const clock = new WorldClock(49); near(clock.hour,1);
  clock.skipTo(23); near(clock.hour,23);
  clock.skipTo(6.5); assert.equal(formatTime(clock.hour),'06:30');
  clock.skipTo(Infinity); near(clock.hour,6.5);
  assert.equal(new WorldClock(NaN).hour,17);
  assert.equal(formatTime(24),'00:00');
});
test('sun rises in the east, crosses above town and sets in the west', () => {
  const dawn = sampleSky(6), noon = sampleSky(12), dusk = sampleSky(18), night = sampleSky(0);
  assert.ok(dawn.sunPosition[0]<0); assert.ok(dusk.sunPosition[0]>0);
  near(dawn.sunPosition[1],0); near(dusk.sunPosition[1],0);
  assert.ok(noon.sunPosition[1]>70); assert.ok(night.sunPosition[1]<-70);
  assert.equal(noon.night,0); assert.equal(night.night,1);
  assert.ok(sampleSky(17).warmth>noon.warmth);
});
test('weather and light remain continuous at midnight and twilight', () => {
  const before = sampleSky(23.9999), after = sampleSky(.0001);
  near(before.ev,after.ev,.001); near(before.cloudCover,after.cloudCover,.001);
  for (const hour of [6,18,19,21]) {
    near(sampleSky(hour-.0001).daylight,sampleSky(hour+.0001).daylight,.001);
    near(sampleSky(hour-.0001).ev,sampleSky(hour+.0001).ev,.001);
  }
  for (let hour=0;hour<24;hour+=.1) {
    const sky = sampleSky(hour);
    assert.ok(sky.cloudCover>=.14 && sky.cloudCover<=.5);
    assert.ok(sky.lightLevel>0);
  }
});
test('time windows include their beginning and exclude their end, across midnight', () => {
  const astro = m('astro-1'), nature = m('nature-1');
  for (const hour of [21,23,0,3.999]) assert.equal(isMissionTime(astro,hour),true);
  for (const hour of [4,12,20.999]) assert.equal(isMissionTime(astro,hour),false);
  assert.equal(isMissionTime(nature,16.5),true); assert.equal(isMissionTime(nature,18),false);
  assert.equal(isMissionTime(m('sports-1'),0),true);
  for (const mission of missions) assert.equal(isMissionTime(mission,missionReferenceHour(mission)),true);
});
test('outdoor metering changes with time while controlled studio stays calibrated', () => {
  const nature=m('nature-1'), studio=m('studio-1');
  near(missionAmbientEV(nature,17),nature.ev);
  assert.ok(missionAmbientEV(nature,12)>missionAmbientEV(nature,23)+15);
  near(missionAmbientEV(studio,12),missionAmbientEV(studio,23));
});
test('an otherwise usable image cannot complete a timed mission outside its window', () => {
  const mission=m('nature-1'), frame={visible:true,distance:20,centerOffset:.2,occluded:false};
  const context={ambientEV:mission.ev,subjectStops:exposureStops(mission.recommended,mission.ev)};
  const wrong=assessPhoto(mission,mission.recommended,frame,{...context,hour:12});
  assert.equal(wrong.passed,false);
  assert.match(wrong.feedback.find(f=>f.label==='Time of day').text,/Meditate/);
  assert.equal(assessPhoto(mission,mission.recommended,frame,{...context,hour:17}).passed,true);
});
test('world time changes actual lights, sky, stars and instanced cloud positions', () => {
  const world=createWorld(); world.setTime(12);
  const sun=world.scene.getObjectByName('sun-light'), moon=world.scene.getObjectByName('moon-light');
  const stars=world.scene.getObjectByName('night-stars'), clouds=world.scene.getObjectByName('clouds');
  const dayColour=world.scene.background.getHex();
  const matrices=Array.from(clouds.instanceMatrix.array);
  assert.ok(sun.position.y>70); assert.ok(sun.intensity>2); assert.equal(stars.visible,false);
  assert.equal(clouds.count,60); assert.equal(clouds.castShadow,false);
  world.setTime(23);
  assert.ok(sun.position.y<0); assert.equal(sun.intensity,0); assert.ok(moon.position.y>0); assert.ok(moon.intensity>0);
  assert.equal(stars.visible,true); assert.ok(stars.material.opacity>.5);
  assert.notEqual(world.scene.background.getHex(),dayColour);
  assert.notDeepEqual(Array.from(clouds.instanceMatrix.array),matrices);
});

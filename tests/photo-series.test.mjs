import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { missions } from '../src/missions.ts';
import { normalizeSeries, recordShot, nextShot, shotMission, seriesReady, seriesCount, shotViewFeedback, assessShotView } from '../src/photo-series.ts';
import { assessPhoto } from '../src/photography.ts';
import { completeMission, earnedMoney, fovForFocal } from '../src/economy.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { contextInFrame } from '../src/framing.ts';

const briefs=missions.filter(m=>m.shots);
const photo=(m,s,id,passed=true)=>({id,missionId:m.id,shotId:s.id,result:{passed}});

test('a set pays once only after every distinct view succeeds, in either order',()=>{
  for(const m of briefs) for(const order of [m.shots,[...m.shots].reverse()]) {
    let progress={},completed=[];
    for(const [index,s] of order.entries()) {
      const bad=photo(m,s,'bad',false);
      assert.deepEqual(recordShot(progress,m,s,bad),progress);
      assert.equal(seriesReady(m,progress,false),false);
      const p=photo(m,s,'photo-'+s.id);
      progress=recordShot(progress,m,s,p);
      const ready=seriesReady(m,progress,true);
      const result=completeMission(completed,m.id,ready);completed=result.completed;
      assert.equal(result.payment,index===order.length-1?m.payment:0);
      assert.equal(earnedMoney(completed),index===order.length-1?m.payment:0);
      assert.equal(seriesCount(m,progress,completed),index+1);
      for(let j=0;j<3;j++) progress=recordShot(progress,m,s,photo(m,s,'burst-'+j));
      assert.equal(progress[m.id].length,index+1,'bursts cannot duplicate a required view');
    }
    assert.equal(completeMission(completed,m.id,seriesReady(m,progress,true)).payment,0);
  }
});

test('briefs support more than two required views without counting repeats',()=>{
  const base=briefs[0],m={...base,shots:[...base.shots,{...base.shots[1],id:'third',title:'Third perspective'}]};
  let progress={};
  for(const [i,s] of m.shots.entries()) {
    progress=recordShot(progress,m,s,photo(m,s,'frame-'+i));
    assert.equal(seriesReady(m,progress,true),i===2);
    assert.equal(seriesCount(m,progress,[]),i+1);
  }
  assert.equal(completeMission([],m.id,seriesReady(m,progress,true)).payment,m.payment);
});

test('receipts survive reloads, journal eviction and quota fallback; invalid receipts do not count',()=>{
  const m=briefs[0],[a,b]=m.shots;
  let progress=recordShot({},m,a,photo(m,a,'first'));
  for(let i=0;i<3;i++) progress=normalizeSeries(JSON.parse(JSON.stringify(progress)),[]);
  assert.equal(seriesCount(m,progress,[]),1);assert.equal(nextShot(m,progress,[]).id,b.id);
  assert.deepEqual(normalizeSeries({unknown:[{shotId:a.id,photoId:'x'}],[m.id]:[null,{}, {shotId:'unknown',photoId:'x'},{shotId:a.id,photoId:''},{shotId:a.id,photoId:42}]}),{});
  assert.equal(normalizeSeries({[m.id]:[{shotId:a.id,photoId:'same'},{shotId:b.id,photoId:'same'}]})[m.id].length,1);
  assert.equal(normalizeSeries(undefined,[photo(m,a,'restored'),photo(m,b,'failed',false)])[m.id].length,1);
  assert.deepEqual(recordShot(progress,m,b,photo(m,a,'wrong-shot')),progress);
  assert.deepEqual(recordShot(progress,m,b,{...photo(m,b,'wrong-story'),missionId:'nature-1'}),progress);
});

test('completed legacy notebooks keep commissions and show a complete set without new receipts',()=>{
  for(const m of briefs) {
    assert.equal(seriesCount(m,normalizeSeries(undefined),[m.id]),m.shots.length);
    assert.equal(completeMission([m.id],m.id,false).payment,0);
    assert.equal(earnedMoney([m.id]),m.payment);
  }
  const single=missions.find(m=>!m.shots);
  assert.equal(seriesReady(single,{},true),true);assert.equal(seriesReady(single,{},false),false);
});

test('one position cannot fill both angles, including a closer position along the front bearing',()=>{
  for(const m of briefs) {
    const [a,b]=m.shots,front=shotMission(m,a).viewpoint,side=shotMission(m,b).viewpoint;
    assert.equal(shotViewFeedback(m,a,front).passed,true);assert.equal(shotViewFeedback(m,b,front).passed,false);
    assert.equal(shotViewFeedback(m,b,side).passed,true);assert.equal(shotViewFeedback(m,a,side).passed,false);
    const dx=front[0]-m.position[0],dz=front[2]-m.position[2],d=Math.hypot(dx,dz),closer=[m.position[0]+dx/d*4,2,m.position[2]+dz/d*4];
    assert.equal(shotViewFeedback(m,b,closer).passed,false,'distance alone is not a new perspective');
    assert.equal(shotViewFeedback(m,b,m.position).passed,false);
    const base={score:100,passed:true,exposureStops:0,feedback:[{label:'Exposure',passed:true,text:'Good'}]};
    assert.equal(assessShotView(base,m,b,front).passed,false);
    assert.equal(assessShotView(base,m,b,side).score,100);
    assert.equal(assessShotView({...base,passed:false,feedback:[{label:'Exposure',passed:false,text:'Dark'}]},m,b,side).passed,false);
  }
});

test('every required viewpoint is walkable, clear, focused and passes its own brief across sensor crops',()=>{
  const world=createWorld();
  for(const m of briefs) for(const shot of m.shots) for(const aspect of [.55,1.5,2.4]) {
    const effective=shotMission(m,shot),s={...effective.recommended,focalLength:35};
    world.update(17,s);world.scene.updateMatrixWorld(true);
    const camera=new THREE.PerspectiveCamera(fovForFocal(35,aspect),aspect,.1,1000);
    camera.position.set(effective.viewpoint[0],world.groundHeight(effective.viewpoint[0],effective.viewpoint[2])+1.7,effective.viewpoint[2]);
    assert.equal(world.canWalk(camera.position.x,camera.position.z),true,`${m.id}/${shot.id} walk`);
    const target=subjectPosition(world,effective),d=target.clone().sub(camera.position);
    camera.lookAt(target);camera.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(camera.position,d.clone().normalize(),0,d.length()-.7);
    const occluded=ray.intersectObjects(world.solids,false).length>0;
    assert.equal(occluded,false,`${m.id}/${shot.id} sightline`);
    const depth=-target.clone().applyMatrix4(camera.matrixWorldInverse).z;
    const frame={visible:true,occluded,distance:d.length(),centerOffset:0,subjectDepth:depth,contextVisible:contextInFrame(world.subjects,world.solids,effective,camera,35)};
    const result=assessShotView(assessPhoto(effective,{...s,focusDistance:depth},frame,{ambientEV:effective.ev,subjectStops:0}),m,shot,camera.position.toArray());
    assert.equal(result.passed,true,`${m.id}/${shot.id} aspect ${aspect}: ${JSON.stringify(result.feedback.filter(f=>!f.passed))}`);
  }
});

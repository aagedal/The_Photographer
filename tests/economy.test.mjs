import test from 'node:test';
import assert from 'node:assert/strict';
import { gearCatalog, normalizeCompleted, normalizeEconomy, earnedMoney, balance, ownsGear, equippedFilter, purchaseGear, completeMission, captureCount, focalRange, zoomFocal, fovForFocal, CaptureSequence } from '../src/economy.ts';
import { missions } from '../src/missions.ts';
const empty = () => normalizeEconomy(undefined, []);

test('successful missions pay once; failures, unknown missions, and repeats pay nothing', () => {
  assert.equal(completeMission([], 'nature-1', false).payment,0);
  assert.equal(completeMission([], 'missing', true).payment,0);
  const first = completeMission([], 'nature-1',true);
  assert.equal(first.payment,120);
  assert.equal(earnedMoney(first.completed),120);
  assert.deepEqual(completeMission(first.completed,'nature-1',true),{completed:['nature-1'],payment:0});
  assert.deepEqual(normalizeCompleted(['nature-1','nature-1','missing',null]),['nature-1']);
  assert.equal(earnedMoney(['nature-1','nature-1']),120);
});
test('starter purchases cannot overdraw the wallet or charge twice', () => {
  const state = empty(), completed=['nature-1'];
  assert.equal(purchaseGear(state,completed,'unknown').reason,'invalid');
  const denied = purchaseGear(state,completed,'flash');
  assert.equal(denied.ok,false); assert.equal(denied.shortfall,60);
  assert.deepEqual(state,empty());
  const bought = purchaseGear(state,completed,'zoom');
  assert.equal(bought.ok,true); assert.equal(balance(bought.economy,completed),0);
  assert.equal(ownsGear(bought.economy,'zoom'),true);
  assert.equal(purchaseGear(bought.economy,completed,'zoom').reason,'owned');
  assert.deepEqual(state,empty());
});
test('payments from five briefs cover original upgrade prices before filter spending', () => {
  const completed = []; let state=empty();
  for (const mission of missions.slice(0,5)) completed.push(mission.id);
  const originalUpgrades = gearCatalog.filter(g => ['zoom', 'flash', 'burst'].includes(g.id));
  for (const gear of originalUpgrades) { const bought=purchaseGear(state,completed,gear.id); assert.equal(bought.ok,true); state=bought.economy; }
  assert.equal(balance(state,completed),120);
  assert.ok(originalUpgrades.every(gear=>ownsGear(state,gear.id)));
});
test('filters require a purchase, charge once, and retain ownership after reload', () => {
  for (const id of ['nd4', 'nd5', 'nd6', 'cpl', 'gnd3']) {
    assert.equal(equippedFilter(id, empty()), 'none');
    assert.equal(purchaseGear(empty(), [], id).ok, false);
    const bought = purchaseGear(empty(), ['nature-1'], id);
    assert.equal(bought.ok, true);
    assert.equal(balance(bought.economy, ['nature-1']), 120 - gearCatalog.find(g => g.id === id).price);
    assert.equal(equippedFilter(id, bought.economy), id);
    assert.equal(purchaseGear(bought.economy, ['nature-1'], id).reason, 'owned');
    const restored = normalizeEconomy(JSON.parse(JSON.stringify(bought.economy)), ['nature-1']);
    assert.equal(equippedFilter(id, restored), id);
  }
  assert.equal(equippedFilter('missing', empty()), 'none');
});
test('older notebooks retain exactly their previous two filters without a charge or duplicate gifts', () => {
  const migrated = normalizeEconomy(undefined, [], false, true);
  assert.deepEqual(migrated.gifted, ['nd6', 'cpl']);
  assert.equal(balance(migrated, []), 0);
  assert.deepEqual(normalizeEconomy(migrated, [], false, true), migrated);
  assert.deepEqual(normalizeEconomy(migrated, [], false, false), migrated);
  assert.ok(['nd4', 'nd5', 'gnd3'].every(id => !ownsGear(migrated, id)));
});
test('old notebooks receive back pay and keep a flash already in use', () => {
  const state=normalizeEconomy(undefined,['nature-1','studio-1'],true);
  assert.equal(balance(state,['nature-1','studio-1']),260);
  assert.equal(ownsGear(state,'flash'),true);
  assert.equal(ownsGear(state,'zoom'),false);
  assert.equal(captureCount(state),1);
});
test('purchases, gifts, and burst preference survive JSON round-trips', () => {
  const completed=missions.slice(0,5).map(m=>m.id);
  let state=empty();
  state=purchaseGear(state,completed,'zoom').economy;
  state=purchaseGear(state,completed,'burst').economy;
  const restored=normalizeEconomy(JSON.parse(JSON.stringify(state)),completed);
  assert.deepEqual(restored,state); assert.equal(balance(restored,completed),300);
  assert.equal(captureCount(restored),3);
});
test('invalid saves cannot duplicate purchases, enable unowned burst, or leave debt', () => {
  const state=normalizeEconomy({purchased:['zoom','zoom','unknown','burst'],gifted:'flash',burstEnabled:true},['nature-1']);
  assert.deepEqual(state,{purchased:['zoom'],gifted:[],burstEnabled:false});
  assert.equal(balance(state,['nature-1']),0);
  assert.deepEqual(empty(),normalizeEconomy(null,[]));
});
test('zoom ownership changes the actual lens range and preserved crop focal length', () => {
  const prime=empty(), zoom=purchaseGear(prime,['nature-1'],'zoom').economy;
  assert.deepEqual(focalRange(prime),[35,35]);
  assert.equal(zoomFocal(prime,35,-1000),35);
  assert.deepEqual(focalRange(zoom),[24,120]);
  assert.equal(zoomFocal(zoom,35,-10000),120);
  assert.equal(zoomFocal(zoom,35,10000),24);
  assert.ok(fovForFocal(120,16/9)<fovForFocal(35,16/9));
  for (const aspect of [16/9,1,.65]) {
    const fov=fovForFocal(35,aspect)*Math.PI/180;
    assert.ok(Math.abs(24/(2*Math.tan(fov/2)*Math.min(1,aspect/1.5))-35)<1e-9);
  }
});
test('burst requires the camera and remains switchable to single-frame shooting', () => {
  assert.equal(captureCount({...empty(),burstEnabled:true}),1);
  const state=purchaseGear(empty(),missions.slice(0,4).map(m=>m.id),'burst').economy;
  assert.equal(captureCount(state),3);
  assert.equal(captureCount({...state,burstEnabled:false}),1);
});
test('burst produces three separate frames at 200 ms intervals without overlapping sequences', () => {
  const sequence=new CaptureSequence();
  assert.equal(sequence.start(1000,3),true);
  assert.equal(sequence.start(1000,3),false);
  assert.deepEqual(sequence.take(1000),{index:1,total:3,last:false});
  assert.equal(sequence.take(1199),null);
  assert.deepEqual(sequence.take(1200),{index:2,total:3,last:false});
  assert.deepEqual(sequence.take(1400),{index:3,total:3,last:true});
  assert.equal(sequence.active,false); assert.equal(sequence.take(1600),null);
});
test('lag never creates duplicate catch-up frames and cancellation stops later frames', () => {
  const sequence=new CaptureSequence(); sequence.start(0,3); sequence.take(0);
  assert.equal(sequence.take(900).index,2); assert.equal(sequence.take(900),null);
  sequence.cancel(); assert.equal(sequence.take(1500),null);
  sequence.start(1600,1); assert.equal(sequence.take(1600).last,true);
});
test('three passing burst frames still produce only one payment', () => {
  let completed=[], paid=0; const sequence=new CaptureSequence(); sequence.start(0,3);
  for (const now of [0,200,400]) {
    assert.ok(sequence.take(now)); const result=completeMission(completed,'sports-1',true);
    completed=result.completed; paid+=result.payment;
  }
  assert.equal(paid,160); assert.deepEqual(completed,['sports-1']);
});

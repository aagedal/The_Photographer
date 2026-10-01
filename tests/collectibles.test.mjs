import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { keepsakes, historian, normalizeCollection, collectKeepsake, collectionComplete, receiveHistorianGift, nearestKeepsake } from '../src/collectibles.ts';
import { createWorld } from '../src/world.ts';
import { walkingRoute, clearWalk } from '../src/navigation.ts';
import { arrivalPosition } from '../src/opening.ts';
import { missions } from '../src/missions.ts';
import { freshStory } from '../src/story.ts';
import { normalizeEconomy } from '../src/economy.ts';

test('thirty distinct finds are outside the assignment catalog', () => {
  assert.equal(keepsakes.length, 30);
  for (const property of ['id', 'name', 'story']) assert.equal(new Set(keepsakes.map(item => item[property])).size, 30);
  assert.equal(new Set(keepsakes.map(item => `${item.x},${item.z}`)).size, 30);
  assert.ok(keepsakes.every(item => !missions.some(m => m.id === item.id)));
  assert.ok(new Set(keepsakes.map(item => item.region)).size >= 12);
});

test('old and malformed saves cannot invent finds or unlock a premature gift', () => {
  for (const raw of [undefined, null, [], 7, 'bad', { found: 'all', giftReceived: true }]) assert.deepEqual(normalizeCollection(raw), { found: [], giftReceived: false });
  assert.deepEqual(normalizeCollection({ found: ['shell', 'shell', null, 'invented', 42], giftReceived: true }), { found: ['shell'], giftReceived: false });
  assert.equal(collectionComplete({ found: Array(30).fill('shell'), giftReceived: false }), false);
});

test('only the final unique find unlocks the invitation; the gift is received once', () => {
  let collection = normalizeCollection();
  const story = freshStory(), economy = normalizeEconomy(undefined, []), completed = [];
  const before = JSON.stringify({ story, economy, completed });
  assert.equal(collectKeepsake(collection, 'invented'), collection);
  for (const [index, item] of keepsakes.entries()) {
    collection = collectKeepsake(collection, item.id);
    assert.equal(collection.found.length, index + 1);
    assert.equal(collectKeepsake(collection, item.id), collection);
    assert.equal(collectionComplete(collection), index === 29);
    assert.deepEqual(normalizeCollection(JSON.parse(JSON.stringify(collection))), collection);
    if (index < 29) assert.equal(receiveHistorianGift(collection), collection);
  }
  assert.equal(collection.giftReceived, false);
  collection = receiveHistorianGift(collection);
  assert.equal(collection.giftReceived, true);
  assert.equal(receiveHistorianGift(collection), collection);
  assert.deepEqual(normalizeCollection(JSON.parse(JSON.stringify(collection))), collection);
  assert.equal(JSON.stringify({ story, economy, completed }), before);
});

test('finds require close proximity, matching elevation and a clear sightline, including sneaking', () => {
  const item = keepsakes[0], ground = () => 4, collection = normalizeCollection();
  assert.equal(nearestKeepsake(collection, item.x, 5.7, item.z, ground), item);
  assert.equal(nearestKeepsake(collection, item.x, 5.05, item.z, ground, 1.05), item);
  assert.equal(nearestKeepsake(collection, item.x + 3, 5.7, item.z, ground), undefined);
  assert.equal(nearestKeepsake(collection, item.x, 10, item.z, ground), undefined);
  assert.equal(nearestKeepsake(collection, item.x, 5.7, item.z, ground, 1.7, () => false), undefined);
  assert.equal(nearestKeepsake(collectKeepsake(collection, item.id), item.x, 5.7, item.z, ground), undefined);
});

test('every actual find is reachable, has distinct geometry and disappears after collection and reload', () => {
  const world = createWorld();
  const signatures = new Set();
  for (const item of keepsakes) {
    const route = walkingRoute(arrivalPosition, [item.x, item.z], world.canWalk);
    assert.ok(route.length, `${item.id}: reachable from the ferry`);
    route.forEach((point, i) => assert.ok(clearWalk(i ? route[i-1] : arrivalPosition, point, world.canWalk), item.id));
    const model = world.collectibles.models.get(item.id);
    assert.ok(model?.visible, item.id);
    assert.equal(model.position.y, world.groundHeight(item.x, item.z) + 0.025);
    const parts = model.children.filter(child => child instanceof THREE.Mesh && !child.name.startsWith('keepsake-glint'));
    assert.ok(parts.length > 0, `${item.id}: physical model`);
    signatures.add(JSON.stringify(parts.map(part => Array.from(part.geometry.attributes.position.array))));
    world.collectibles.setFound([item.id]);
    assert.equal(model.visible, false);
    world.collectibles.setFound([]);
    assert.equal(model.visible, true);
  }
  assert.equal(signatures.size, 30, 'every item has a different silhouette');
  const route = walkingRoute(arrivalPosition, [historian.x, historian.z], world.canWalk);
  assert.ok(route.length, 'historian is reachable');
  const restored = normalizeCollection({ found: keepsakes.map(item => item.id), giftReceived: true });
  world.collectibles.setFound(restored.found);
  assert.ok([...world.collectibles.models.values()].every(model => !model.visible));
});

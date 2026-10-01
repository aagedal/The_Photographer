import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { conversationTopics, dialoguePages, frameConversation, speakerObjectName } from '../src/conversation.ts';
import { freshStory } from '../src/story.ts';
import { npcCatalog } from '../src/exploration.ts';
import { createWorld } from '../src/world.ts';

test('dialogue pages preserve the complete speech, including punctuation and long sentences', () => {
  for (const text of ['', 'One quiet sentence.', 'Why stay? Because this is home. “Come back,” he said.', 'A long sentence '.repeat(60), 'A fairly long sentence with pauses. '.repeat(30)]) {
    const pages = dialoguePages(text);
    assert.equal(pages.join(' '), text.trim().replace(/\s+/g, ' '));
    assert.ok(pages.every(page => page.length <= 240));
  }
});

test('optional questions acknowledge the report and caption review without mutating progress', () => {
  const story = freshStory(), before = JSON.stringify(story);
  for (const id of [...npcCatalog.map(npc => npc.id), 'boatbuilder']) {
    const topics = conversationTopics(id, story);
    assert.equal(topics.length, 2);
    assert.equal(new Set(topics.map(topic => topic.id)).size, topics.length);
    topics.forEach(topic => assert.ok(topic.question && dialoguePages(topic.answer).length));
  }
  assert.equal(JSON.stringify(story), before);
  assert.match(conversationTopics('editor', {...story, workshopShared: true})[1].answer, /apprentice/);
  assert.match(conversationTopics('ranger', {...story, reportPublished: true})[1].answer, /location/);
});

test('the separate conversation lens frames every actual speaker, including nested Arthur and rotated Ruth', () => {
  const world = createWorld(); world.setTime(14); world.update(0, {filter:'none',shutter:1/125});
  for (const id of [...npcCatalog.map(npc => npc.id), 'arthur', 'boatbuilder']) {
    const speaker = world.scene.getObjectByName(speakerObjectName(id)); assert.ok(speaker, id);
    const original = speaker.position.toArray();
    for (const [width, height] of [[1440,900],[705,889],[390,844],[844,390]]) {
      const camera = new THREE.PerspectiveCamera();
      frameConversation(camera, speaker, width, height);
      const face = speaker.localToWorld(new THREE.Vector3(0, id === 'arthur' ? 1.65 : 1.73, 0.22));
      const projected = face.clone().project(camera);
      assert.ok(projected.x > -0.9 && projected.x < 0.3, `${id} face stays beside the dialogue`);
      assert.ok(projected.y > -0.05 && projected.y < 0.95, `${id} face stays above the phone panel`);
      assert.ok(camera.position.distanceTo(face) > 2, `${id} lens stays outside the body`);
    }
    assert.deepEqual(speaker.position.toArray(), original, 'the lens does not move the character');
  }
});

// Characters can be mid-route when approached; the lens must avoid nearby walls.
test('conversation sightlines stay clear beside buildings at different routine hours', () => {
  const world = createWorld(), camera = new THREE.PerspectiveCamera(), ray = new THREE.Raycaster();
  for (const hour of [0, 6, 8, 12, 14, 18, 20, 23]) {
    world.setTime(hour); world.update(0, {filter:'none',shutter:1/125}); world.scene.updateMatrixWorld(true);
    for (const id of [...npcCatalog.map(npc=>npc.id), 'arthur', 'boatbuilder']) {
      const speaker = world.scene.getObjectByName(speakerObjectName(id));
      frameConversation(camera, speaker, 1440, 900, world.solids);
      const face = speaker.localToWorld(new THREE.Vector3(0,1.65,0.22)), direction = face.sub(camera.position);
      ray.set(camera.position, direction.clone().normalize()); ray.far = direction.length() - 0.35;
      const blockers = ray.intersectObjects(world.solids, true).filter(hit=> {
        for (let object=hit.object; object; object=object.parent) if (object===speaker) return false;
        return true;
      });
      assert.equal(blockers.length, 0, `${id} at ${hour}:00`);
    }
  }
});

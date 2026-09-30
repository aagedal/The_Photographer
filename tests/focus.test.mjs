import test from 'node:test';
import assert from 'node:assert/strict';
import { FocusState, focusDistanceAt, focusPosition, subjectInFocus, INFINITY_FOCUS } from '../src/focus.ts';
import { assessPhoto } from '../src/photography.ts';
import { missions } from '../src/missions.ts';

test('focus ring resolves close distances finely, stays bounded, and reaches infinity', () => {
  assert.equal(focusDistanceAt(-10), 0.7);
  assert.equal(focusDistanceAt(100), INFINITY_FOCUS);
  assert.equal(focusDistanceAt(200), INFINITY_FOCUS);
  for (const position of [0, 10, 25, 50, 80, 98.3, 99, 99.1, 99.9, 100]) {
    assert.ok(Math.abs(focusPosition(focusDistanceAt(position)) - position) < 1e-10);
  }
  assert.ok(focusDistanceAt(1) - focusDistanceAt(0) < 0.06);
  assert.ok(focusDistanceAt(90) - focusDistanceAt(89) > 30);
});

test('manual focus locks the acquired plane and persists exactly across reloads', () => {
  const focus = new FocusState();
  focus.toggle(3.127);
  assert.equal(focus.mode, 'manual');
  assert.equal(focus.distance, 3.127);
  const restored = new FocusState(JSON.parse(JSON.stringify(focus)));
  assert.deepEqual(restored, focus);
  focus.acquire(8.2); // one-shot focus preserves manual mode
  assert.equal(focus.mode, 'manual');
  assert.equal(focus.distance, 8.2);
  focus.toggle(12);
  assert.equal(focus.mode, 'auto');
});

test('invalid and legacy saves get safe focus defaults, and keyboard adjusts manual focus', () => {
  for (const saved of [undefined, { mode: 'wrong', distance: NaN }, { distance: Infinity }, { distance: '3' }]) {
    const focus = new FocusState(saved);
    assert.equal(focus.mode, 'auto');
    assert.equal(focus.distance, 10);
  }
  const focus = new FocusState({ distance: -10 });
  focus.adjust(-1);
  assert.equal(focus.distance, 0.7);
  assert.equal(focus.mode, 'manual');
  focus.adjust(200);
  assert.equal(focus.distance, INFINITY_FOCUS);
  focus.adjust(-1);
  assert.ok(Math.abs(focus.distance - 1000) < 1e-10);
});

test('sharpness follows lens optics and stopping down rescues small focus errors', () => {
  assert.equal(subjectInFocus(3, 120, 2.8, 3), true);
  assert.equal(subjectInFocus(3, 120, 2.8, 8), false);
  assert.equal(subjectInFocus(3, 120, 2.8, 3.5), false);
  assert.equal(subjectInFocus(3, 120, 16, 3.5), true);
  assert.equal(subjectInFocus(450, 35, 2.8, INFINITY_FOCUS), true);
  assert.equal(subjectInFocus(450, 35, 2.8, 0.7), false);
  assert.equal(subjectInFocus(3, 120, 2.8, NaN), false);
  assert.equal(subjectInFocus(-3, 120, 2.8, 3), false);
});

test('a defocused portrait cannot earn payment despite correct exposure and craft', () => {
  const mission = missions.find(m => m.id === 'studio-1');
  const frame = { visible: true, distance: 4, subjectDepth: 3, centerOffset: 0.25, occluded: false };
  const settings = { ...mission.recommended, focalLength: 120, focusMode: 'manual', focusDistance: 3 };
  const focused = assessPhoto(mission, settings, frame);
  assert.equal(focused.passed, true);
  const missed = assessPhoto(mission, { ...settings, focusDistance: 8 }, frame);
  assert.equal(missed.passed, false);
  assert.equal(missed.feedback.find(f => f.label === 'Focus').passed, false);
  assert.equal(missed.feedback.find(f => f.label === 'Exposure').passed, true);
  assert.match(missed.feedback.find(f => f.label === 'Focus').text, /press Q/);
  // Legacy photos without a recorded focus plane keep their original assessment.
  assert.equal(assessPhoto(mission, mission.recommended, frame).passed, true);
});

test('sky feedback uses the rendered sky plane rather than the mission marker', () => {
  const mission = missions.find(m => m.id === 'astro-1');
  const frame = { visible: true, distance: 20, subjectDepth: 20, centerOffset: 0.1, occluded: false };
  assert.equal(assessPhoto(mission, { ...mission.recommended, focusDistance: INFINITY_FOCUS }, frame).passed, true);
  const missed = assessPhoto(mission, { ...mission.recommended, focusDistance: 0.7 }, frame);
  assert.equal(missed.passed, false);
  assert.match(missed.feedback.find(f => f.label === 'Focus').text, /infinity/);
});

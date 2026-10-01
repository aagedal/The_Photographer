import test from 'node:test';
import assert from 'node:assert/strict';
import { speechScore, createSpeech } from '../src/speech.ts';
import { WorldAudio } from '../src/audio.ts';

test('voices have stable identities, changing vowels and bounded passages', () => {
  const line = 'Welcome home. There is still time to sit together.';
  const arthur = speechScore('arthur', line), mara = speechScore('ranger', line);
  assert.deepEqual(arthur, speechScore('arthur', line));
  assert.ok(arthur.every(s => s.pitch < 140));
  assert.ok(mara.every(s => s.pitch > 175));
  assert.ok(new Set(arthur.map(s => s.formants.join(','))).size > 1);
  assert.ok(new Set(arthur.map(s => s.duration)).size > 1);
  for (const speaker of ['arthur', 'ranger', 'coach', 'editor', 'planner', 'maker', 'astronomer', 'unknown']) {
    const score = speechScore(speaker, line.repeat(100));
    assert.ok(score.length > 10 && score.length <= 40);
    assert.ok(score.at(-1).start + score.at(-1).duration <= 7.8);
    assert.ok(score.every((s, i) => s.duration > 0.08 && s.formants.every(Number.isFinite) && (!i || s.start > score[i - 1].start + score[i - 1].duration)));
  }
  assert.deepEqual(speechScore('arthur', '… “ ”'), []);
  assert.ok(speechScore('ranger', 'Héllo, 世界!').length > 0);
});

test('sentences leave breathing room and questions rise in pitch', () => {
  const score = speechScore('arthur', 'Hi. Why?');
  assert.equal(score.length, 2);
  assert.ok(score[1].start - score[0].start - score[0].duration > 0.32);
  assert.ok(score[1].endPitch > score[1].pitch);
});

// Exercise browser lifecycle and routing without depending on an audio device.
class Param {
  value = 0;
  events = [];
  setValueAtTime(value, at) { this.value = value; this.events.push(['set', value, at]); }
  setTargetAtTime(value, at, time) { this.value = value; this.events.push(['target', value, at, time]); }
  linearRampToValueAtTime(value, at) { this.value = value; this.events.push(['linear', value, at]); }
  exponentialRampToValueAtTime(value, at) { this.value = value; this.events.push(['exponential', value, at]); }
  cancelScheduledValues(at) { this.events.push(['cancel', at]); }
  cancelAndHoldAtTime(at) { this.events.push(['hold', at]); }
}
class Node {
  gain = new Param(); frequency = new Param(); Q = new Param(); pan = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  connections = []; starts = []; stops = []; disconnected = false;
  constructor(kind) { this.kind = kind; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start(...args) { this.starts.push(args); }
  stop(at) { this.stops.push(at); }
  setPeriodicWave(wave) { this.wave = wave; }
}
class Context {
  currentTime = 10; sampleRate = 8000; state = 'suspended'; nodes = []; destination = new Node('destination');
  node(kind) { const node = new Node(kind); this.nodes.push(node); return node; }
  createGain() { return this.node('gain'); }
  createBiquadFilter() { return this.node('filter'); }
  createDynamicsCompressor() { return this.node('compressor'); }
  createBufferSource() { return this.node('buffer'); }
  createOscillator() { return this.node('oscillator'); }
  createStereoPanner() { return this.node('pan'); }
  createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  createPeriodicWave(real, imaginary) { return { real, imaginary }; }
  async resume() { this.state = 'running'; }
}
const speechSources = context => context.nodes.filter(n => n.wave);
async function unlockedAudio(t, volume = 0.6) {
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  t.after(() => { if (previous) globalThis.AudioContext = previous; else delete globalThis.AudioContext; });
  const audio = new WorldAudio(true, volume);
  audio.unlock(); await Promise.resolve();
  return audio;
}

test('first gesture plays only the latest pending line, once', async t => {
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  t.after(() => { if (previous) globalThis.AudioContext = previous; else delete globalThis.AudioContext; });
  const audio = new WorldAudio();
  audio.speak('arthur', 'Old line.'); audio.speak('ranger', 'New line.');
  assert.equal(audio.context, undefined);
  audio.unlock(); await Promise.resolve();
  assert.equal(speechSources(audio.context).length, 1);
  assert.ok(speechSources(audio.context)[0].frequency.events[0][1] > 175);
  audio.unlock();
  assert.equal(speechSources(audio.context).length, 1);
});

test('dialogue remains audible in a modal and shares live volume and mute', async t => {
  const audio = await unlockedAudio(t);
  audio.silence(); audio.speak('arthur', 'Welcome home.');
  audio.update(17, { x: 0, z: 0 }, 0, [], false, false, false);
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.output.gain.value, 0.6 * 0.65);
  assert.equal(audio.speech !== undefined, true);
  audio.volume = 0.2;
  audio.update(17, { x: 0, z: 0 }, 0, [], false, false, false);
  assert.equal(audio.output.gain.value, 0.2 * 0.65);
  audio.enabled = false;
  audio.update(17, { x: 0, z: 0 }, 0, [], false, false, false);
  assert.equal(audio.output.gain.value, 0);
  assert.equal(audio.speech, undefined);
  audio.speak('ranger', 'Muted line.'); audio.enabled = true; audio.unlock();
  assert.equal(speechSources(audio.context).length, 1);
});

test('replacing a voice and closing or hiding cancels playback and queued lines', async t => {
  const audio = await unlockedAudio(t);
  audio.speak('arthur', 'Hello.');
  const first = speechSources(audio.context)[0];
  audio.speak('ranger', 'Hello.');
  assert.equal(first.stops.at(-1), audio.context.currentTime + 0.02);
  audio.stopSpeaking();
  assert.equal(speechSources(audio.context)[1].stops.at(-1), audio.context.currentTime + 0.02);
  assert.equal(audio.speech, undefined);
  audio.context.state = 'suspended'; audio.speak('editor', 'Do not replay after blur.'); audio.silence();
  audio.unlock(); await Promise.resolve();
  assert.equal(speechSources(audio.context).length, 2);
});

test('scheduled bells and transients cannot ring after leaving the world', async t => {
  const audio = await unlockedAudio(t);
  audio.update(7.99, { x: -43, z: 16 }, 0, [], true, false, false);
  audio.update(8.01, { x: -43, z: 16 }, 0, [], true, false, false);
  const delayed = audio.context.nodes.filter(n => n.starts.some(([at]) => at > audio.context.currentTime));
  assert.ok(delayed.length >= 6);
  audio.silence();
  assert.ok(delayed.every(n => n.stops.at(-1) <= audio.context.currentTime + 0.02));
});

test('speech fades on cancellation and disconnects its entire graph on end', () => {
  const context = new Context();
  const session = createSpeech(context, context.destination, 'arthur', 'A cup of tea?');
  assert.ok(session.endTime > context.currentTime);
  session.stop(); session.stop();
  const source = speechSources(context)[0];
  assert.equal(source.stops.length, 2);
  assert.ok(context.nodes.some(n => n.gain.events.some(e => e[0] === 'linear' && e[1] === 0 && e[2] === context.currentTime + 0.015)));
  source.onended();
  assert.ok(context.nodes.every(n => n.disconnected));
});

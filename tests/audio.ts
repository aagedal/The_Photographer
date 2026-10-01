import { createSpeech } from '../src/speech.ts';
import { WorldAudio } from '../src/audio.ts';
import { freshStory } from '../src/story.ts';
import { normalizeEconomy } from '../src/economy.ts';
import { localPose } from '../src/life.ts';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const audio = new WorldAudio();
element('speak').onclick = () => {
  audio.unlock(); audio.speak(element<HTMLSelectElement>('speaker').value, element<HTMLTextAreaElement>('line').value);
};
element('stop').onclick = () => audio.stopSpeaking();
element('mute').onclick = () => {
  audio.enabled = !audio.enabled;
  if (!audio.enabled) audio.silence(); else audio.unlock();
  element('mute').textContent = audio.enabled ? 'Mute' : 'Enable sound';
};
element<HTMLInputElement>('volume').oninput = event => { audio.volume = Number((event.target as HTMLInputElement).value) / 100; };
window.addEventListener('blur', () => audio.silence());
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.silence(); });
function update() { audio.update(17, { x: 0, z: 0 }, 0, [], false, false, false); requestAnimationFrame(update); }
update();

function prepareGame(position: number[], openingSeen = true) {
  audio.silence();
  localStorage.setItem('the-photographer-playtest-audio-checks-v1', JSON.stringify({
    version: 1, filterShopVersion: 1, story: freshStory(), discovered: ['intro-deer'], completed: [], photos: [],
    active: 'intro-deer', position, hour: 17, openingSeen, walkingIntroduction: !openingSeen,
    economy: normalizeEconomy(undefined, []), sound: { enabled: audio.enabled, volume: audio.volume },
  }));
  location.href = '/?playtest=audio-checks';
}
element('game-arthur').onclick = () => prepareGame([-23, 55]);
element('game-mara').onclick = () => { const mara = localPose('ranger', 17); prepareGame([mara.x + 1, mara.z]); };
element('game-opening').onclick = () => prepareGame([8, 94], false);

function metrics(data: Float32Array) {
  let sum = 0, peak = 0, jump = 0;
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i])) throw new Error('Nonfinite sample');
    sum += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i]));
    if (i) jump = Math.max(jump, Math.abs(data[i] - data[i - 1]));
  }
  return { rms: Math.sqrt(sum / data.length), peak, jump };
}
function wav(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0), bytes = new ArrayBuffer(44 + data.length * 2), view = new DataView(bytes);
  const label = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  label(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); label(8, 'WAVE'); label(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, 'data'); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), true);
  return new Blob([bytes], { type: 'audio/wav' });
}
const sampleUrls: string[] = [];
element('run').onclick = async () => {
  const button = element<HTMLButtonElement>('run'), results = element('results');
  button.disabled = true; audio.silence(); results.textContent = 'Rendering…';
  sampleUrls.forEach(url => URL.revokeObjectURL(url)); sampleUrls.length = 0; element('samples').replaceChildren();
  const lines: string[] = [];
  try {
    for (const [id, name] of [['arthur', 'Arthur'], ['ranger', 'Mara'], ['coach', 'Theo'], ['editor', 'June'], ['planner', 'Alma'], ['maker', 'Eli'], ['astronomer', 'Ida']]) {
      const context = new OfflineAudioContext(1, 44100 * 9, 44100);
      const volume = context.createGain(); volume.gain.value = 0.6 * 0.65; volume.connect(context.destination);
      const session = createSpeech(context, volume, id, 'Welcome home. The kettle is on. There is still time to sit together.')!;
      const rendered = await context.startRendering(), data = rendered.getChannelData(0);
      const signal = metrics(data.subarray(0, Math.ceil(session.endTime * context.sampleRate)));
      if (signal.rms < 0.002 || signal.peak > 0.35 || signal.jump > 0.08) throw new Error(`${name}: signal outside mix limits ${JSON.stringify(signal)}`);
      if (metrics(data.subarray(Math.ceil((session.endTime + 0.05) * context.sampleRate))).peak > 0.00001) throw new Error(`${name}: residual sound after ending`);
      lines.push(`PASS ${name}: RMS ${signal.rms.toFixed(4)}, peak ${signal.peak.toFixed(4)}, sample jump ${signal.jump.toFixed(4)}`);
      const title = document.createElement('p'), player = document.createElement('audio'); title.textContent = name;
      const url = URL.createObjectURL(wav(rendered)); sampleUrls.push(url); player.controls = true; player.src = url;
      element('samples').append(title, player);
    }
    for (const cancelAt of [0, 0.4]) {
      const context = new OfflineAudioContext(1, 44100 * 4, 44100);
      const session = createSpeech(context, context.destination, 'arthur', 'Welcome home. There is time for tea.')!;
      let rendered: AudioBuffer;
      if (cancelAt) {
        const suspended = context.suspend(cancelAt), rendering = context.startRendering();
        await suspended; session.stop(); await context.resume(); rendered = await rendering;
      } else { session.stop(); rendered = await context.startRendering(); }
      const tail = rendered.getChannelData(0).subarray(Math.ceil((cancelAt + 0.045) * context.sampleRate));
      if (metrics(tail).peak > 0.00001) throw new Error(`Cancellation at ${cancelAt}s left audible speech`);
      lines.push(`PASS cancellation ${cancelAt === 0 ? 'before first syllable' : 'during playback'}: silent tail`);
    }
    results.textContent = `${lines.join('\n')}\n9 / 9 offline checks passed.`;
  } catch (error) { results.textContent = `${lines.join('\n')}\nFAIL ${error instanceof Error ? error.message : String(error)}`; }
  finally { button.disabled = false; }
};

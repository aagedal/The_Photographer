// Small, nonverbal voices: a warm harmonic source shaped by moving vowel
// resonances. Text controls phrasing, never intelligible speech or narration.
interface Voice { pitch: number; resonance: number; pace: number }
const voices: Record<string, Voice> = {
  arthur: { pitch: 118, resonance: 0.84, pace: 0.92 },
  boatbuilder: { pitch: 164, resonance: 0.91, pace: 0.94 },
  ranger: { pitch: 196, resonance: 1.06, pace: 1.04 },
  coach: { pitch: 144, resonance: 0.94, pace: 1.16 },
  editor: { pitch: 177, resonance: 1.02, pace: 1.12 },
  planner: { pitch: 223, resonance: 1.12, pace: 0.98 },
  maker: { pitch: 158, resonance: 0.97, pace: 1.02 },
  astronomer: { pitch: 207, resonance: 1.08, pace: 0.9 },
  historian: { pitch: 182, resonance: 0.94, pace: 0.88 },
};
const vowels = [[390, 900, 2250], [480, 1050, 2400], [650, 1400, 2600], [420, 1850, 2700], [320, 800, 2100]];
export interface VoiceSyllable {
  start: number; duration: number; pitch: number; endPitch: number;
  formants: number[]; strength: number;
}

export function speechScore(speaker: string, text: string): VoiceSyllable[] {
  const voice = voices[speaker] ?? voices.maker;
  let seed = 719;
  for (const c of `${speaker}:${text}`) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const words = text.match(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)*[,.!?;:…]?/gu) ?? [];
  const score: VoiceSyllable[] = [];
  let time = 0.04;
  for (const word of words) {
    const count = Math.min(3, Math.max(1, Math.ceil(word.replace(/[^\p{L}]/gu, '').length / 4)));
    for (let i = 0; i < count; i++) {
      const duration = (0.095 + random() * 0.075) / voice.pace;
      // A short greeting-like passage, even for a long page of dialogue.
      if (time + duration > 7.8 || score.length >= 40) return score;
      const pitch = voice.pitch * (0.92 + random() * 0.16);
      const question = word.endsWith('?') && i === count - 1;
      const formants = vowels[Math.floor(random() * vowels.length)].map(f => f * voice.resonance);
      score.push({ start: time, duration, pitch, endPitch: pitch * (question ? 1.17 : 0.86 + random() * 0.16), formants, strength: 0.28 + random() * 0.08 });
      time += duration + 0.025 + random() * 0.035;
    }
    time += /[.!?…]$/.test(word) ? 0.32 : /[,;:]$/.test(word) ? 0.17 : 0.035;
  }
  return score;
}

export interface SpeechSession { endTime: number; stop(): void }
export function createSpeech(context: BaseAudioContext, destination: AudioNode, speaker: string, text: string): SpeechSession | undefined {
  const score = speechScore(speaker, text);
  if (!score.length) return;
  const start = context.currentTime + 0.015;
  const endTime = start + score.at(-1)!.start + score.at(-1)!.duration + 0.035;
  const source = context.createOscillator(), envelope = context.createGain();
  const vibrato = context.createOscillator(), depth = context.createGain();
  const lowpass = context.createBiquadFilter(), output = context.createGain();
  const real = new Float32Array(24), imaginary = new Float32Array(24);
  for (let i = 1; i < imaginary.length; i++) imaginary[i] = 1 / i ** 1.35;
  source.setPeriodicWave(context.createPeriodicWave(real, imaginary));
  envelope.gain.value = 0;
  lowpass.type = 'lowpass'; lowpass.frequency.value = 3200; lowpass.Q.value = 0.5;
  output.gain.value = 1;
  source.connect(envelope);
  const formants = [4, 5, 7].map((q, i) => {
    const filter = context.createBiquadFilter(), gain = context.createGain();
    filter.type = 'bandpass'; filter.Q.value = q; gain.gain.value = [0.9, 0.45, 0.2][i];
    envelope.connect(filter); filter.connect(gain); gain.connect(lowpass);
    return { filter, gain };
  });
  // A little fundamental keeps closed-mouth murmurs warm rather than tinny.
  const body = context.createGain(); body.gain.value = 0.12;
  envelope.connect(body); body.connect(lowpass); lowpass.connect(output); output.connect(destination);
  vibrato.frequency.value = 4.7; depth.gain.value = score[0].pitch * 0.014;
  vibrato.connect(depth); depth.connect(source.frequency);
  for (const syllable of score) {
    const at = start + syllable.start, end = at + syllable.duration;
    source.frequency.setValueAtTime(syllable.pitch, at);
    source.frequency.exponentialRampToValueAtTime(syllable.endPitch, end);
    formants.forEach(({ filter }, i) => filter.frequency.setTargetAtTime(syllable.formants[i], at, 0.018));
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(syllable.strength, at + 0.018);
    envelope.gain.setValueAtTime(syllable.strength * 0.82, end - 0.035);
    envelope.gain.linearRampToValueAtTime(0, end);
  }
  const nodes: AudioNode[] = [source, envelope, vibrato, depth, body, lowpass, output, ...formants.flatMap(f => [f.filter, f.gain])];
  let stopped = false;
  source.onended = () => { for (const node of nodes) node.disconnect(); };
  source.start(start); vibrato.start(start); source.stop(endTime); vibrato.stop(endTime);
  return { endTime, stop() {
    if (stopped || context.currentTime >= endTime) return;
    stopped = true;
    const now = context.currentTime;
    output.gain.cancelScheduledValues(now); output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(0, now + 0.015);
    source.stop(now + 0.02); vibrato.stop(now + 0.02);
  } };
}

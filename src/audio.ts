import { ambientLevels } from './life.ts';
import { createSpeech, type SpeechSession } from './speech.ts';

interface Position { x: number; z: number; visible?: boolean }
interface AudioSource { position: Position; visible: boolean }

// Entirely synthesized: no downloads, background music, or asset loading.
// Browsers allow the context to start only after a keyboard/pointer gesture.
export class WorldAudio {
  enabled: boolean;
  volume: number;
  private context?: AudioContext;
  private master?: GainNode;
  private mix?: GainNode;
  private output?: GainNode;
  private noise?: AudioBuffer;
  private speech?: SpeechSession;
  private pendingSpeech?: { speaker: string; text: string };
  private transients = new Map<AudioScheduledSourceNode, GainNode>();
  private beds: Partial<Record<'wind' | 'water' | 'crickets' | 'ocean', GainNode>> = {};
  private engines: { oscillator: OscillatorNode; gain: GainNode; pan: StereoPannerNode }[] = [];
  private nextBird = 0;
  private nextStep = 0;
  private stepSide = 1;
  private active = false;
  private failed = false;
  private previousHour?: number;
  constructor(enabled = true, volume = 0.6) {
    this.enabled = enabled;
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.6;
  }
  get available() { return !this.failed; }
  unlock() {
    if (!this.enabled || this.failed) return;
    try {
      if (!this.context) this.initialize();
      if (this.context!.state === 'suspended') void this.context!.resume().then(() => this.startPendingSpeech()).catch(() => {});
      else this.startPendingSpeech();
    } catch { this.failed = true; }
  }
  private initialize() {
    const context = this.context = new AudioContext();
    this.master = context.createGain(); this.master.gain.value = 0;
    this.mix = context.createGain(); this.output = context.createGain(); this.output.gain.value = this.volume * 0.65;
    const rumble = context.createBiquadFilter(); rumble.type = 'highpass'; rumble.frequency.value = 35; rumble.Q.value = 0.5;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 4;
    limiter.attack.value = 0.006; limiter.release.value = 0.2;
    this.master.connect(this.mix); this.mix.connect(rumble); rumble.connect(limiter);
    limiter.connect(this.output); this.output.connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 719;
    for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 2147483647 * 2 - 1; }
    // Blend several smoothing times for fuller wind and surf without a harsh
    // white-noise hiss. Short crossfades make the looping seam continuous.
    const air = context.createBuffer(1, data.length, context.sampleRate), airData = air.getChannelData(0);
    let slow = 0, medium = 0, fast = 0;
    for (let i = 0; i < data.length; i++) {
      slow += 0.008 * (data[i] - slow); medium += 0.06 * (data[i] - medium); fast += 0.3 * (data[i] - fast);
      airData[i] = (slow * 0.5 + medium * 0.3 + fast * 0.2) * 2.4;
    }
    const seam = Math.floor(context.sampleRate * 0.06);
    for (let i = 0; i < seam; i++) {
      const blend = i / (seam - 1);
      airData[data.length - seam + i] = airData[data.length - seam + i] * (1 - blend) + airData[i] * blend;
    }
    for (const [name,frequency,q] of [['wind',450,0.4],['ocean',650,0.7],['water',1800,0.5],['crickets',4300,6]] as const) {
      const source = context.createBufferSource(); source.buffer = name === 'wind' || name === 'ocean' ? air : this.noise; source.loop = true;
      if (source.buffer === air) source.loopStart = seam / context.sampleRate;
      const filter = context.createBiquadFilter(); filter.type = name === 'wind' ? 'lowpass' : 'bandpass'; filter.frequency.value=frequency; filter.Q.value=q;
      const gain=context.createGain(); gain.gain.value=0; source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(0, Math.random() * 2); this.beds[name]=gain;
      if (name==='crickets') {
        const tremolo=context.createOscillator(), depth=context.createGain(); tremolo.frequency.value=18; depth.gain.value=0.012;
        const pulse = context.createGain(); pulse.gain.value=0.5;
        filter.disconnect(); filter.connect(pulse); pulse.connect(gain);
        depth.gain.value=0.45; tremolo.connect(depth); depth.connect(pulse.gain); tremolo.start();
      }
    }
    this.engines=Array.from({length:3},(_,i)=>{
      const oscillator=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();
      oscillator.type='sawtooth';oscillator.frequency.value=43+i*7;filter.type='lowpass';filter.frequency.value=160;gain.gain.value=0;
      oscillator.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.master!);oscillator.start();return {oscillator,gain,pan};
    });
  }
  speak(speaker: string, text: string) {
    this.stopSpeaking();
    if (!this.enabled || this.failed || !text.trim()) return;
    this.pendingSpeech = { speaker, text };
    // Also supports the first dialogue on page load: it stays queued until a
    // real gesture unlocks the browser, and cannot accumulate stale lines.
    if (this.context?.state === 'running') this.startPendingSpeech();
  }
  private startPendingSpeech() {
    if (!this.enabled || !this.pendingSpeech || this.context?.state !== 'running' || !this.mix) return;
    const { speaker, text } = this.pendingSpeech; this.pendingSpeech = undefined;
    this.output!.gain.setTargetAtTime(this.volume * 0.65, this.context.currentTime, 0.025);
    this.speech = createSpeech(this.context, this.mix, speaker, text);
  }
  stopSpeaking() { this.pendingSpeech = undefined; this.speech?.stop(); this.speech = undefined; }
  silence() {
    this.active = false; this.stopSpeaking();
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.setTargetAtTime(0, now, 0.025);
      for (const [source, gain] of this.transients) {
        gain.gain.cancelAndHoldAtTime(now); gain.gain.linearRampToValueAtTime(0, now + 0.015);
        source.stop(now + 0.02);
      }
      this.transients.clear();
    }
  }
  update(hour: number, player: Position, yaw: number, vehicles: AudioSource[], playing: boolean, moving: boolean, running: boolean, sneaking = false) {
    const context=this.context;
    this.active=playing && this.enabled;
    if (this.failed || !context || !this.master) return;
    const now=context.currentTime;
    this.output!.gain.setTargetAtTime(this.enabled ? this.volume * 0.65 : 0, now, 0.025);
    if (!this.enabled) this.stopSpeaking();
    if (this.speech && now >= this.speech.endTime) this.speech = undefined;
    this.master.gain.setTargetAtTime(this.active ? (this.speech ? 0.45 : 1) : 0,now,0.1);
    const levels=ambientLevels(hour,player.x,player.z);
    this.beds.wind!.gain.setTargetAtTime(levels.wind,now,0.3);
    this.beds.ocean!.gain.setTargetAtTime(levels.ocean * (0.7 + 0.3 * Math.sin(now * 0.7)),now,0.3);
    this.beds.water!.gain.setTargetAtTime(levels.water,now,0.3);
    // The modulation is applied before this final gate, so daytime is silent.
    this.beds.crickets!.gain.setTargetAtTime(levels.crickets*0.025,now,0.3);
    this.engines.forEach((engine,i)=>{
      const car=vehicles[i]; const dx=car?car.position.x-player.x:0,dz=car?car.position.z-player.z:0,distance=Math.hypot(dx,dz);
      engine.gain.gain.setTargetAtTime(car?.visible?0.06/(1+(distance/10)**2):0,now,0.2);
      engine.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/20)),now,0.1);
    });
    const previous=this.previousHour; this.previousHour=hour;
    if (!this.active || context.state!=='running') return;
    if (previous!==undefined && hour>previous && hour-previous<0.1 && Math.floor(previous)!==Math.floor(hour) && [8,12,18].includes(Math.floor(hour))) {
      const strength=0.08/(1+(Math.hypot(player.x+43,player.z-16)/24)**2);
      for(let strike=0;strike<3;strike++) for(const harmonic of [1,2,2.7]) this.tone(now+strike*1.8,1.6,440*harmonic,438*harmonic,strength/harmonic,0,'sine');
    }
    if (levels.birds>0 && now>=this.nextBird) {
      this.nextBird=now+2.4+Math.random()*3.5;
      const pan=Math.sin(now*0.8)*0.65;
      for (let i=0;i<3;i++) this.tone(now+i*0.14,0.095,2100+i*300,3300-i*230,0.025*levels.birds,pan);
    }
    if (moving && now>=this.nextStep) {
      this.nextStep=now+(sneaking?0.7:running?0.29:0.44);
      this.stepSide *= -1;
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();source.buffer=this.noise!;
      const duration = sneaking ? 0.12 : running ? 0.085 : 0.1;
      filter.type='lowpass';filter.frequency.value=480+Math.random()*320;pan.pan.value=this.stepSide*0.12;
      source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.master);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime((sneaking?0.035:0.13)*(0.85+Math.random()*0.3),now+0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
      source.start(now,Math.random()*2);source.stop(now+duration+0.01);this.transients.set(source,gain);
      source.onended=()=>{this.transients.delete(source);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
      this.tone(now,0.1,95+Math.random()*15,48,sneaking?0.008:0.035,this.stepSide*0.1,'triangle');
    }
  }
  private tone(start: number,duration: number,from: number,to: number,volume: number,pan=0,type: OscillatorType='sine') {
    const context=this.context;if (!context || !this.master) return;
    const oscillator=context.createOscillator(),gain=context.createGain(),stereo=context.createStereoPanner();oscillator.type=type;stereo.pan.value=pan;
    oscillator.frequency.setValueAtTime(from,start);oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+0.01);gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    oscillator.connect(gain);gain.connect(stereo);stereo.connect(this.master);oscillator.start(start);oscillator.stop(start+duration+0.02);this.transients.set(oscillator,gain);
    oscillator.onended=()=>{this.transients.delete(oscillator);oscillator.disconnect();gain.disconnect();stereo.disconnect();};
  }
  shutter() {
    if (!this.context || !this.active) return;
    const now=this.context.currentTime;this.tone(now,0.055,700,180,0.11,0,'triangle');this.tone(now+0.07,0.045,420,120,0.08,0,'triangle');
  }
}

import { ambientLevels } from './life.ts';

interface Position { x: number; z: number; visible?: boolean }
interface AudioSource { position: Position; visible: boolean }

// Entirely synthesized: no downloads, background music, or asset loading.
// Browsers allow the context to start only after a keyboard/pointer gesture.
export class WorldAudio {
  enabled: boolean;
  volume: number;
  private context?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private beds: Partial<Record<'wind' | 'water' | 'crickets' | 'ocean', GainNode>> = {};
  private engines: { oscillator: OscillatorNode; gain: GainNode; pan: StereoPannerNode }[] = [];
  private nextBird = 0;
  private nextStep = 0;
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
      if (this.context!.state === 'suspended') void this.context!.resume().catch(() => {});
    } catch { this.failed = true; }
  }
  private initialize() {
    const context = this.context = new AudioContext();
    this.master = context.createGain(); this.master.gain.value = 0;
    const limiter = context.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 6;
    this.master.connect(limiter); limiter.connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 719;
    for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 2147483647 * 2 - 1; }
    for (const [name,frequency,q] of [['wind',450,0.4],['ocean',650,0.7],['water',1800,0.5],['crickets',4300,6]] as const) {
      const source = context.createBufferSource(); source.buffer = this.noise; source.loop = true;
      const filter = context.createBiquadFilter(); filter.type = name === 'wind' ? 'lowpass' : 'bandpass'; filter.frequency.value=frequency; filter.Q.value=q;
      const gain=context.createGain(); gain.gain.value=0; source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); this.beds[name]=gain;
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
  silence() { this.active=false; if (this.context && this.master) this.master.gain.setTargetAtTime(0,this.context.currentTime,0.025); }
  update(hour: number, player: Position, yaw: number, vehicles: AudioSource[], playing: boolean, moving: boolean, running: boolean, sneaking = false) {
    const context=this.context;
    this.active=playing && this.enabled;
    if (this.failed || !context || !this.master) return;
    const now=context.currentTime;
    this.master.gain.setTargetAtTime(this.active?this.volume*0.65:0,now,0.1);
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
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise!;
      filter.type='lowpass';filter.frequency.value=650;source.connect(filter);filter.connect(gain);gain.connect(this.master);
      gain.gain.setValueAtTime(sneaking?0.035:0.15,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.09);source.start(now);source.stop(now+0.1);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }
  }
  private tone(start: number,duration: number,from: number,to: number,volume: number,pan=0,type: OscillatorType='sine') {
    const context=this.context;if (!context || !this.master) return;
    const oscillator=context.createOscillator(),gain=context.createGain(),stereo=context.createStereoPanner();oscillator.type=type;stereo.pan.value=pan;
    oscillator.frequency.setValueAtTime(from,start);oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+0.01);gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    oscillator.connect(gain);gain.connect(stereo);stereo.connect(this.master);oscillator.start(start);oscillator.stop(start+duration+0.02);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();stereo.disconnect();};
  }
  shutter() {
    if (!this.context || !this.active) return;
    const now=this.context.currentTime;this.tone(now,0.055,700,180,0.11,0,'triangle');this.tone(now+0.07,0.045,420,120,0.08,0,'triangle');
  }
}

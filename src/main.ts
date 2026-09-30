import * as THREE from 'three';
import { categories, missions, type Category, type Mission } from './missions.ts';
import { assessPhoto, exposureStops, shutterLabel, type Assessment, type CameraSettings, type Framing } from './photography.ts';
import { createWorld, subjectPosition } from './world.ts';
import { defaultStudioRig, normalizeStudioRig, lightNames, studioExposureOffset, flashCanFire, flashPower, flashRenderIntensity, subjectExposureStops, type StudioRig } from './lighting.ts';
import './style.css';

const paths: Record<string, string> = {
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/><path d="M18 10h.01"/>',
  mountain: '<path d="m2 20 7-14 5 9 3-5 5 10H2Z"/><path d="m7 10 2 2 2-2"/>',
  flag: '<path d="M5 21V3c5-3 9 4 14 1v10c-5 3-9-4-14-1"/>',
  book: '<path d="M12 5c-3-3-7-3-10-1v15c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Z"/><path d="M12 5v15"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  compass: '<path d="m12 2 5 17-5-3-5 3L12 2Z"/><path d="M12 2v14"/>',
  aperture: '<circle cx="12" cy="12" r="9"/><path d="m8 4 8 14M3 11h16M8 20l8-14M4 7l8 14M20 17H4M20 7l-8 14"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6M12 2v3"/>',
  filter: '<circle cx="10" cy="12" r="7"/><circle cx="15" cy="12" r="7"/>',
  tripod: '<path d="M9 3h6v4H9zM12 7v13M12 9 4 21M12 9l8 12"/>',
  move: '<path d="M2 12h20M7 7l-5 5 5 5M17 7l5 5-5 5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
  heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>',
  sports: '<path d="m12 7 3 4 5 1M14 11l-4 4-5-1M10 15l3 6M5 6l5 1-3 5"/><circle cx="15" cy="4" r="2"/>',
  studio: '<path d="M4 4h16v12H4zM12 16v5M8 21h8M7 7h10v6H7z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.camera}</svg>`;
const categoryIcon: Record<Category, string> = { Nature: 'mountain', Sports: 'sports', News: 'book', Wedding: 'heart', Studio: 'studio', Astro: 'moon' };
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Photo { id: string; missionId: string; image: string; settings: CameraSettings; result: Assessment; date: number; studio?: StudioRig }
interface Save { version: 1; completed: string[]; photos: Photo[]; active: string; lighting?: { flashPower: number; studio: StudioRig } }
const storageKey = new URLSearchParams(location.search).has('playtest') ? 'the-photographer-playtest-v1' : 'the-photographer-save-v1';
let storageAvailable = true;
function loadSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (raw?.version === 1) return {
      version: 1,
      completed: Array.isArray(raw.completed) ? raw.completed.filter((id: unknown) => missions.some(m => m.id === id)) : [],
      active: missions.some(m => m.id === raw.active) ? raw.active : missions[0].id,
      lighting: { flashPower: flashPower({ flashPower: raw.lighting?.flashPower } as CameraSettings), studio: normalizeStudioRig(raw.lighting?.studio) },
      photos: Array.isArray(raw.photos) ? raw.photos.filter((p: Photo) => missions.some(m => m.id === p.missionId) && typeof p.image === 'string' && /^data:image\/jpeg;base64,/.test(p.image) && p.image.length < 800000 && p.settings && p.result && Array.isArray(p.result.feedback)).slice(0, 16) : [],
    };
  } catch { storageAvailable = false; }
  return { version: 1, completed: [], photos: [], active: missions[0].id };
}
const save = loadSave();
let activeMission = missions.find(m => m.id === save.active)!;
let settings: CameraSettings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: save.lighting?.flashPower ?? 0 };
let studioRig = normalizeStudioRig(save.lighting?.studio);
let lightingOpen = false;
let lightingMode: 'flash' | 'studio' = 'flash';
let cameraMode = false;
let lowQuality = false;
let boardCategory: Category | 'All' = 'All';
let capturing = false;
let toastTimer = 0;

const shutterValues = [1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 0.25, 0.5, 1, 5, 10, 15, 30, 60];
const apertureValues = [1.8, 2.8, 4, 5.6, 8, 11, 16, 22];
const isoValues = [100, 200, 400, 800, 1600, 3200, 6400];
const options = (values: number[], label: (v: number) => string, selected: number) => values.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${label(v)}</option>`).join('');

$('app').innerHTML = `
  <header>
    <div class="brand"><span class="brand-icon">${icon('camera')}</span><div><h1>The Photographer</h1><p>A LITTLE WORLD. A DIFFERENT PERSPECTIVE.</p></div></div>
    <nav aria-label="Main navigation">
      <button id="nav-world" class="active" title="Explore the world">${icon('mountain')}<span>Explore</span></button>
      <button id="nav-board" title="Assignments (Q)">${icon('flag')}<span>Assignments</span></button>
      <button id="nav-journal" title="Photo journal (J)">${icon('book')}<span>Photo journal</span></button>
      <button id="nav-help" title="How to play">${icon('info')}</button>
    </nav>
    <div class="profile"><span class="avatar">P</span><div><strong id="player-rank">A fresh perspective</strong><small id="player-progress">0 of 12 stories told</small></div></div>
  </header>
  <main class="workspace">
    <div class="world-toolbar"><span>YOUR NEXT GREAT SHOT IS OUT THERE.</span><span class="season"><i class="dot"></i>Willowbrook · A small photography adventure</span></div>
    <section class="stage" id="stage" aria-label="Interactive 3D photography world">
      <div class="scene-tint"></div>
      <aside class="mission-panel" id="mission-panel" aria-label="Active assignment"></aside>
      <div class="scene-location"><span id="time-icon">${icon('sun')}</span><div><strong id="location-title">Willow Lake</strong><small id="light-label">Golden hour · Find the good light</small></div></div>
      <div class="compass"><span>N</span><span id="compass-arrow">${icon('compass')}</span></div>
      <button class="minimap" id="minimap-button" title="Open world map (M)" aria-label="Open world map"><canvas id="minimap" width="268" height="232"></canvas><div class="minimap-label">WILLOWBROOK ${icon('map').replace('<svg ', '<svg style="width:8px;height:8px;vertical-align:middle" ')}</div></button>
      <div class="world-hint"><kbd>W A S D</kbd> walk <span class="look-hint">· Drag to look</span><span class="extra-hint">· Shift to wander faster</span></div>
      <div class="scene-tools"><button id="explore-mode" class="selected">${icon('mountain')}Explore</button><button id="camera-mode">${icon('camera')}Viewfinder <span style="opacity:.5">E</span></button><button id="lighting-kit" aria-expanded="false">${icon('bolt')}Lighting</button></div>
      <aside id="lighting-panel" class="lighting-panel" aria-label="Lighting kit" hidden></aside>
      <div class="target-marker" id="target-marker"><span></span><small id="target-label"></small></div>
      <div class="viewfinder" id="viewfinder"><span class="finder-meta">MANUAL · <span id="lens-label">35</span> MM · 3:2</span><span class="focus-point"></span></div>
      <div class="flash" id="flash"></div>
    </section>
    <section class="camera-bar" aria-label="Manual camera settings">
      <div class="camera-id">${icon('camera')}<div><strong>Your trusty camera</strong><small>MANUAL MODE · <span id="bar-lens">35</span> MM</small></div></div>
      <div class="setting"><label for="shutter">${icon('timer')}SHUTTER</label><select id="shutter">${options(shutterValues, shutterLabel, settings.shutter)}</select></div>
      <div class="setting"><label for="aperture">${icon('aperture')}APERTURE</label><select id="aperture">${options(apertureValues, v => `f / ${v}`, settings.aperture)}</select></div>
      <div class="setting"><label for="iso">${icon('sun')}ISO</label><select id="iso">${options(isoValues, String, settings.iso)}</select></div>
      <div class="setting filter-setting"><label for="filter">${icon('filter')}LENS FILTER</label><select id="filter"><option value="none">No filter</option><option value="nd6">ND64 · 6 stops</option><option value="cpl">Polarizer</option></select></div>
      <div class="equipment"><button id="tripod" aria-pressed="false">${icon('tripod')}Tripod<span class="switch"></span></button><button id="panning" aria-pressed="false">${icon('move')}Panning<span class="switch"></span></button><button id="flash-toggle" aria-pressed="false">${icon('bolt')}Flash<span class="switch"></span></button></div>
      <div class="exposure"><strong>AMBIENT METER<span id="ev-label">0 EV</span></strong><div class="meter">${Array.from({ length: 11 }, () => '<i></i>').join('')}<span class="needle" id="meter-needle"></span></div><div class="meter-labels"><span>−3</span><span>0</span><span>+3</span></div></div>
      <div class="shutter-wrap"><button id="capture" class="shutter-button" aria-label="Take a photograph (C)"><span>${icon('camera')}</span></button><div><strong>Make a photograph</strong><small>Press C · Take your time</small></div></div>
    </section>
    <footer class="status-bar"><span><i class="status-dot"></i><span id="status-text">A little curiosity goes a long way.</span></span><span class="build-label">EARLY PLAYABLE PROTOTYPE · 0.1</span><span><button id="quality" class="quality-button">Quality: balanced</button><span id="fps"></span></span></footer>
  </main>
  <dialog id="modal" aria-labelledby="modal-title"></dialog>
  <div class="toast" id="toast" role="status"></div>
`;

const stage = $('stage');
const modal = $<HTMLDialogElement>('modal');
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
} catch {
  stage.insertAdjacentHTML('beforeend', `<div class="error-screen"><h2>A little more graphics power, please.</h2><p>This prototype needs WebGL2. Enable hardware acceleration in your browser, then reload. Current Safari, Chrome, and Firefox on desktop are the intended starting point.</p></div>`);
  throw new Error('WebGL2 renderer could not be initialized.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.domElement.classList.add('world'); renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Game world. WASD to walk, drag to look, C to photograph.');
stage.prepend(renderer.domElement);
const world = createWorld();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 240);
camera.rotation.order = 'YXZ';
const player = new THREE.Vector3(...activeMission.viewpoint);
let yaw = 0, pitch = 0;
const keys = new Set<string>();
const targetVector = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const projected = new THREE.Vector3();
let elapsed = 0;
let drag = false;
let lastPointerX = 0, lastPointerY = 0;

function toast(message: string) {
  $('toast').textContent = message; $('toast').classList.add('show');
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('toast').classList.remove('show'), 3600);
}
function persist() {
  save.active = activeMission.id;
  save.lighting = { flashPower: flashPower(settings), studio: normalizeStudioRig(studioRig) };
  try { localStorage.setItem(storageKey, JSON.stringify(save)); storageAvailable = true; }
  catch {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...save, photos: save.photos.slice(0, 4) })); storageAvailable = true; toast('Storage is nearly full. The four newest photos and your progress were saved.'); }
    catch { storageAvailable = false; toast('Your browser could not save progress. Photos remain available during this session.'); }
  }
  updateProgress();
}
function updateProgress() {
  const xp = missions.filter(m => save.completed.includes(m.id)).reduce((total, m) => total + m.reward, 0);
  $('player-progress').textContent = `${save.completed.length} of 12 stories told · ${xp} XP`;
  $('player-rank').textContent = save.completed.length >= 12 ? 'An eye for every story' : save.completed.length >= 6 ? 'Finding your voice' : save.completed.length >= 1 ? 'An eye for a story' : 'A fresh perspective';
  $('status-text').textContent = storageAvailable ? `${save.completed.length}/12 assignments · ${save.photos.length} photographs · Saved on this device` : 'Saving unavailable · This session only';
}
function renderMission() {
  const m = activeMission;
  $('mission-panel').innerHTML = `
    <div class="eyebrow">${icon('flag').replace('<svg ', '<svg style="width:12px;height:12px" ')}THE ASSIGNMENT<span class="mission-count">${String(missions.indexOf(m) + 1).padStart(2, '0')} / 12</span></div>
    <span class="mission-category">${icon(categoryIcon[m.category])}${m.category} photography</span>
    <h2>${esc(m.title)}</h2><p class="description">${esc(m.description)}</p>
    <div class="mission-meta"><span>${icon('pin')}${esc(m.location)}</span><span class="reward">+ ${m.reward} XP</span></div>
    <div class="field-notes"><strong>${icon('book')}A note for your camera bag</strong>${esc(m.lesson)}</div>
    ${save.completed.includes(m.id) ? '<p class="completed-stamp">✓ Story told. There is always another angle.</p>' : ''}
    <button class="primary" id="travel">Find the spot ${icon('arrow')}</button>
    <button class="text-button" id="suggest">Try suggested settings ${icon('aperture').replace('<svg ', '<svg style="width:12px;height:12px" ')}</button>`;
  $('travel').onclick = () => travelTo(m);
  $('suggest').onclick = () => { settings = { ...m.recommended, flashPower: 0 }; if (m.category === 'Studio') { studioRig = defaultStudioRig(); applyStudioRig(); } syncSettings(); if (lightingOpen) renderLightingPanel(); persist(); toast('A starting point, not a rule. Adjust the settings and see what changes.'); };
  $('location-title').textContent = m.location;
  $('light-label').textContent = m.category === 'Astro' ? 'Blue night · Give the light time' : m.technique === 'news' ? 'Evening light · Find the story' : 'Golden hour · Find the good light';
  $('time-icon').innerHTML = icon(m.category === 'Astro' ? 'moon' : 'sun');
}
function faceSubject(m: Mission) {
  const p = subjectPosition(world, m);
  const d = p.clone().sub(player);
  yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  updateCamera();
}
function travelTo(m: Mission) {
  player.set(...m.viewpoint); settings.tripod = false;
  // Travel preserves manual exposure choices but packs the tripod away.
  syncSettings(); faceSubject(m); renderer.shadowMap.needsUpdate = true;
  toast(`You arrived at ${m.location}. Drag to look, or press E to raise your camera.`);
}
function selectMission(m: Mission) {
  activeMission = m; world.setNight(m.category === 'Astro'); renderer.shadowMap.needsUpdate = true;
  lightingMode = m.category === 'Studio' ? 'studio' : 'flash';
  applyStudioRig(); setCameraMode(false); renderMission(); updateExposure(); persist(); if (lightingOpen) renderLightingPanel();
}
function syncSettings() {
  for (const key of ['shutter', 'aperture', 'iso', 'filter'] as const) $<HTMLSelectElement>(key).value = String(settings[key]);
  for (const key of ['tripod', 'panning'] as const) { $(key).classList.toggle('on', settings[key]); $(key).setAttribute('aria-pressed', String(settings[key])); }
  $('flash-toggle').classList.toggle('on', flashPower(settings) > 0); $('flash-toggle').setAttribute('aria-pressed', String(flashPower(settings) > 0));
  renderer.shadowMap.needsUpdate = true;
  updateExposure();
}
function sceneEV() {
  return activeMission.ev + (activeMission.category === 'Studio' ? studioExposureOffset(studioRig, subjectPosition(world, activeMission).y) : 0);
}
function updateExposure() {
  const stops = exposureStops(settings, sceneEV());
  $('ev-label').textContent = `${stops > 0 ? '+' : ''}${stops.toFixed(1)} EV`;
  $('meter-needle').style.left = `${50 + THREE.MathUtils.clamp(stops, -3, 3) / 3 * 48}%`;
  $('meter-needle').style.background = Math.abs(stops) > 1.6 ? '#b68a58' : '#718448';
  renderer.domElement.style.filter = '';
  updateLightingReadout();
}
function setCameraMode(value: boolean) {
  cameraMode = value; stage.classList.toggle('camera-mode', value);
  $('camera-mode').classList.toggle('selected', value); $('explore-mode').classList.toggle('selected', !value); updateExposure();
}
function updateCamera() {
  camera.position.copy(player); camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
}
function applyStudioRig() {
  const target = activeMission.category === 'Studio' ? subjectPosition(world, activeMission) : new THREE.Vector3(28, 1.35, -26);
  world.setStudioRig(studioRig, [target.x, target.y, target.z], activeMission.category === 'Studio');
  renderer.shadowMap.needsUpdate = true;
}
function applyCameraLight(s: CameraSettings, takingPhoto = false) {
  const preview = takingPhoto || cameraMode || lightingOpen;
  // Apply ambient exposure in linear renderer space. Divide the brief pulse by this gain
  // so changing shutter duration cannot change flash exposure within the sync range.
  const stops = exposureStops(s, activeMission.ev);
  const gain = preview ? THREE.MathUtils.clamp(2 ** stops, takingPhoto ? 0.000001 : 0.025, takingPhoto ? 32 : 8) : 1;
  renderer.toneMappingExposure = 1.05 * gain;
  const direction = camera.getWorldDirection(new THREE.Vector3());
  world.setFlash([player.x, player.y, player.z], [direction.x, direction.y, direction.z], preview ? flashRenderIntensity(s) / gain : 0);
}

function toggleLightingKit() {
  lightingOpen = !lightingOpen;
  $('lighting-panel').hidden = !lightingOpen; stage.classList.toggle('lighting-open', lightingOpen);
  $('lighting-kit').classList.toggle('selected', lightingOpen); $('lighting-kit').setAttribute('aria-expanded', String(lightingOpen));
  if (lightingOpen) { lightingMode = activeMission.category === 'Studio' ? 'studio' : 'flash'; renderLightingPanel(); }
  renderer.shadowMap.needsUpdate = true;
}
function renderLightingPanel() {
  const power = flashPower(settings);
  $('lighting-panel').innerHTML = `<div class="lighting-heading"><div><div class="eyebrow">YOUR LIGHTING KIT</div><h2>Shape the light.</h2></div><button class="close" id="close-lighting" aria-label="Close lighting kit">${icon('close')}</button></div>
    <div class="lighting-mode-tabs"><button data-light-mode="flash" class="${lightingMode === 'flash' ? 'selected' : ''}">${icon('bolt')}Camera flash</button><button data-light-mode="studio" class="${lightingMode === 'studio' ? 'selected' : ''}">${icon('studio')}Studio lights</button></div>
    <div class="lighting-readings"><span>Ambient<strong id="lighting-ambient">—</strong></span><span>Subject<strong id="lighting-subject">—</strong></span></div>
    <div class="lighting-section" ${lightingMode === 'studio' ? 'hidden' : ''}><label class="light-select-label" for="flash-power">Manual flash power</label><select id="flash-power">${[0, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map(v => `<option value="${v}" ${v === power ? 'selected' : ''}>${v === 0 ? 'Off' : v === 1 ? 'Full power' : `1/${Math.round(1 / v)} power`}</option>`).join('')}</select>
      <p class="lighting-note">A brief pulse lights nearby subjects most. Double the distance and only a quarter of the flash light reaches them. Preview shows the pulse as a steady light.</p>
      <p class="lighting-note" id="flash-sync-note"></p>
    </div>
    <div class="lighting-section" ${lightingMode === 'flash' ? 'hidden' : ''}>${activeMission.category !== 'Studio' ? '<p class="lighting-note">The lights are set up in Daylight Studio. Visit the pottery maker to see your adjustments.</p><button class="primary" id="visit-studio">Visit the studio →</button>' : '<p class="lighting-note">Continuous lights: shutter, aperture, and ISO all affect their exposure. Move a light closer to make its falloff stronger.</p>'}
      <div class="lighting-presets"><button data-light-preset="balanced">Balanced</button><button data-light-preset="dramatic">Dramatic</button><button data-light-preset="rim">Rim light</button><button data-light-preset="off">Lights off</button></div>${activeMission.category === 'Studio' ? '<button class="secondary flash-practice" id="flash-practice">Try a close flash portrait →</button>' : ''}
      ${lightNames.map(name => {
        const config = studioRig[name]; const label = name[0].toUpperCase() + name.slice(1);
        return `<div class="studio-light-card"><label class="light-enable"><input type="checkbox" data-light-name="${name}" ${config.enabled ? 'checked' : ''} aria-label="${label} light enabled"/><strong>${label} light</strong><span>${name === 'key' ? 'Shape' : name === 'fill' ? 'Soften shadows' : 'Separate edges'}</span></label>${([
          ['power', 'Power', 0, 2, 0.05, `${Math.round(config.power * 100)}%`],
          ['angle', 'Angle', -160, 160, 5, `${config.angle}°`],
          ['distance', 'Distance', 1, 4, 0.1, `${config.distance.toFixed(1)} m`],
          ['height', 'Height', 1.5, 4, 0.1, `${config.height.toFixed(1)} m`],
        ] as const).map(([key, text, min, max, step, value]) => `<label class="light-slider" for="${name}-${key}"><span>${text}</span><output id="${name}-${key}-value">${value}</output></label><input id="${name}-${key}" type="range" data-light="${name}" data-property="${key}" min="${min}" max="${max}" step="${step}" value="${config[key]}" aria-label="${label} light ${text.toLowerCase()}"/>`).join('')}
        <label class="light-select-label" for="${name}-colour">Colour</label><select id="${name}-colour" data-light-colour="${name}" aria-label="${label} light colour">${['daylight', 'warm', 'cool'].map(c => `<option value="${c}" ${c === config.colour ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}</select></div>`;
      }).join('')}
    </div><p class="lighting-note">GN 24 at ISO 100 · sync limit 1/250 s · no high-speed sync. The subject meter is approximate; the scene renders light angles and shadows.</p>`;
  $('close-lighting').onclick = toggleLightingKit;
  $('lighting-panel').querySelectorAll<HTMLButtonElement>('[data-light-mode]').forEach(button => button.onclick = () => { lightingMode = button.dataset.lightMode as typeof lightingMode; renderLightingPanel(); });
  if ($('flash-practice')) $('flash-practice').onclick = () => {
    selectMission(missions.find(m => m.id === 'studio-1')!);
    for (const name of lightNames) studioRig[name].enabled = false;
    const target = subjectPosition(world, activeMission); player.set(target.x, 1.7, target.z + 3.5);
    settings = { shutter: 1 / 250, aperture: 4, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0.25 };
    applyStudioRig(); faceSubject(activeMission); setCameraMode(true); syncSettings(); persist(); lightingMode = 'flash'; renderLightingPanel();
    toast('Close subject, 1/4 flash, darker room. Change shutter speed and compare the ambient reading.');
  };
  $<HTMLSelectElement>('flash-power').onchange = e => { settings.flashPower = Number((e.target as HTMLSelectElement).value); syncSettings(); renderer.shadowMap.needsUpdate = true; persist(); };
  if ($('visit-studio')) $('visit-studio').onclick = () => { selectMission(missions.find(m => m.id === 'studio-1')!); travelTo(activeMission); };
  $('lighting-panel').querySelectorAll<HTMLInputElement>('[data-light-name]').forEach(input => input.onchange = () => {
    studioRig[input.dataset.lightName as keyof StudioRig].enabled = input.checked; applyStudioRig(); updateExposure(); persist();
  });
  $('lighting-panel').querySelectorAll<HTMLInputElement>('[data-property]').forEach(input => {
    input.oninput = () => {
      const name = input.dataset.light as keyof StudioRig, key = input.dataset.property as 'power' | 'angle' | 'distance' | 'height';
      const value = Number(input.value); studioRig[name][key] = value;
      $(`${name}-${key}-value`).textContent = key === 'power' ? `${Math.round(value * 100)}%` : key === 'angle' ? `${value}°` : `${value.toFixed(1)} m`;
      applyStudioRig(); updateExposure();
    };
    input.onchange = persist;
  });
  $('lighting-panel').querySelectorAll<HTMLSelectElement>('[data-light-colour]').forEach(select => select.onchange = () => {
    studioRig[select.dataset.lightColour as keyof StudioRig].colour = select.value as StudioRig['key']['colour']; applyStudioRig(); persist();
  });
  $('lighting-panel').querySelectorAll<HTMLButtonElement>('[data-light-preset]').forEach(button => button.onclick = () => {
    studioRig = defaultStudioRig();
    if (button.dataset.lightPreset === 'dramatic') { studioRig.fill.power = 0.05; studioRig.key.angle = -70; studioRig.rim.power = 0.25; }
    if (button.dataset.lightPreset === 'rim') { studioRig.key.power = 0.1; studioRig.fill.power = 0; studioRig.rim.power = 1.5; }
    if (button.dataset.lightPreset === 'off') for (const name of lightNames) studioRig[name].enabled = false;
    applyStudioRig(); updateExposure(); persist(); renderLightingPanel();
  });
  updateLightingReadout();
}
function updateLightingReadout() {
  if (!lightingOpen || !$('lighting-subject')) return;
  const distance = subjectPosition(world, activeMission).distanceTo(player);
  const ambient = exposureStops(settings, sceneEV());
  const subject = subjectExposureStops(settings, sceneEV(), distance, activeMission.category !== 'Astro');
  const format = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} EV`;
  $('lighting-ambient').textContent = format(ambient); $('lighting-subject').textContent = format(subject);
  $('flash-sync-note').textContent = flashPower(settings) === 0 ? 'Flash off. Adjust the continuous lights or switch on the camera flash.' : !flashCanFire(settings) ? 'Above 1/250 s sync: flash will not fire. Choose 1/250 s or a slower shutter.' : activeMission.category === 'Astro' ? 'The stars are too distant for your flash. It can still light a nearby foreground.' : `${activeMission.subject} · ${distance.toFixed(1)} m. Try a faster shutter to darken the background while keeping flash exposure steady.`;
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  // The frame and saved photo share a centered 3:2 crop.
  $('viewfinder').style.width = `${Math.min(width, height * 1.5)}px`;
  updateLensLabel();
}
new ResizeObserver(resize).observe(stage);

function getFraming(): Framing {
  targetVector.copy(subjectPosition(world, activeMission));
  const direction = targetVector.clone().sub(camera.position);
  const distance = direction.length();
  projected.copy(targetVector).project(camera);
  const cropX = Math.min(1, 1.5 / camera.aspect), cropY = Math.min(1, camera.aspect / 1.5);
  const nx = projected.x / cropX, ny = projected.y / cropY;
  const visible = projected.z > -1 && projected.z < 1 && Math.abs(nx) < 0.96 && Math.abs(ny) < 0.96;
  raycaster.set(camera.position, direction.normalize()); raycaster.far = Math.max(0, distance - 0.7);
  const occluded = activeMission.category !== 'Astro' && raycaster.intersectObjects(world.solids, false).length > 0;
  return { visible, distance, centerOffset: Math.max(Math.abs(nx), Math.abs(ny)), occluded };
}

function makePhoto(s: CameraSettings, frame: Framing): string {
  applyCameraLight(s, true); renderer.shadowMap.needsUpdate = true;
  renderer.render(world.scene, camera);
  const source = renderer.domElement;
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  const sourceAspect = source.width / source.height;
  const sw = sourceAspect > 1.5 ? source.height * 1.5 : source.width;
  const sh = sw / 1.5;
  const sx = (source.width - sw) / 2, sy = (source.height - sh) / 2;
  const base = document.createElement('canvas'); base.width = 900; base.height = 600;
  const baseCtx = base.getContext('2d')!;
  baseCtx.drawImage(source, sx, sy, sw, sh, 0, 0, 900, 600);
  const croppedX = projected.x / Math.min(1, 1.5 / camera.aspect), croppedY = projected.y / Math.min(1, camera.aspect / 1.5);
  const fx = (croppedX * 0.5 + 0.5) * 900, fy = (-croppedY * 0.5 + 0.5) * 600;
  const shake = !s.tripod && s.shutter > 1 / 30 && !s.panning;
  const portrait = ['couple', 'portrait'].includes(activeMission.technique) && s.aperture <= 4;
  const pan = activeMission.category === 'Sports' && s.panning && s.shutter >= 1 / 125;
  const blur = shake ? Math.min(s.shutter * 4, 7) : pan ? 3 : portrait ? 1.8 : 0;
  ctx.filter = blur ? `blur(${blur}px)` : 'none'; ctx.drawImage(base, 0, 0); ctx.filter = 'none';
  if ((portrait || pan) && !shake && frame.visible) {
    // A simple subject mask is a teaching cue, pending depth-buffer optics.
    const radius = THREE.MathUtils.clamp(1100 / frame.distance, 20, 140);
    ctx.save(); ctx.beginPath(); ctx.ellipse(fx, fy + radius * 0.15, radius, radius * 1.5, 0, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(base, 0, 0); ctx.restore();
  }
  if (activeMission.category === 'Sports' && !pan && s.shutter > 1 / 500 && frame.visible) {
    const r = Math.min(100, 1800 / frame.distance), offset = Math.min(35, s.shutter * 450);
    ctx.save(); ctx.globalAlpha = 0.3;
    for (let i = 1; i <= 3; i++) ctx.drawImage(base, fx - r, fy - r, r * 2, r * 2, fx - r + offset * i, fy - r, r * 2, r * 2);
    ctx.restore();
  }
  if (activeMission.technique === 'trails' && s.shutter >= 30) {
    ctx.save(); ctx.strokeStyle = '#e5e7cf'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) { const a = i * 2.399, r = 30 + (i * 37) % 510; ctx.beginPath(); ctx.arc(450, 80, r, a, a + s.shutter / 1600); ctx.stroke(); }
    ctx.restore();
  }
  const pixels = ctx.getImageData(0, 0, 900, 600);
  const noise = Math.max(0, Math.log2(s.iso / 100)) * 2.3;
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (Math.random() - 0.5) * noise;
    for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.max(0, Math.min(255, pixels.data[i + c] + grain));
  }
  ctx.putImageData(pixels, 0, 0);
  const vignette = ctx.createRadialGradient(450, 300, 160, 450, 300, 550); vignette.addColorStop(0, '#172a2100'); vignette.addColorStop(1, '#172a2138'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 900, 600);
  return canvas.toDataURL('image/jpeg', 0.83);
}

function capture() {
  if (modal.open || capturing) return;
  capturing = true; keys.clear();
  const captureSettings = { ...settings };
  updateCamera(); world.update(elapsed, captureSettings); world.scene.updateMatrixWorld(true);
  const frame = getFraming();
  const ambientEV = sceneEV();
  const result = assessPhoto(activeMission, captureSettings, frame, { ambientEV, subjectStops: subjectExposureStops(captureSettings, ambientEV, frame.distance, activeMission.category !== 'Astro' && frame.visible && !frame.occluded) });
  const photo: Photo = { id: crypto.randomUUID(), missionId: activeMission.id, image: makePhoto(captureSettings, frame), settings: captureSettings, result, date: Date.now(), studio: activeMission.category === 'Studio' ? normalizeStudioRig(studioRig) : undefined };
  save.photos.unshift(photo); save.photos = save.photos.slice(0, 16);
  if (result.passed && !save.completed.includes(activeMission.id)) save.completed.push(activeMission.id);
  persist(); renderMission();
  $('flash').classList.remove('fire'); void $('flash').offsetWidth; $('flash').classList.add('fire');
  window.setTimeout(() => { capturing = false; openReview(photo); }, 280);
}

function showModal(title: string, eyebrow: string, subtitle: string, content: string) {
  keys.clear(); drag = false;
  modal.innerHTML = `<div class="modal-header"><div><div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="close" id="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${content}</div>`;
  if (!modal.open) modal.showModal();
  $('close-modal').onclick = () => modal.close();
}
function openBoard() {
  showModal('There’s a story everywhere.', 'THE ASSIGNMENT BOARD', 'Six ways of seeing. Twelve small stories. Pick the one that calls to you.', `<div class="category-tabs">${(['All', ...categories] as const).map(c => `<button data-category="${c}" class="${boardCategory === c ? 'active' : ''}">${c}</button>`).join('')}</div><div class="mission-grid">${missions.filter(m => boardCategory === 'All' || m.category === boardCategory).map(m => `<button class="assignment-card" data-mission="${m.id}"><span class="eyebrow">${icon(categoryIcon[m.category]).replace('<svg ', '<svg style="width:13px;height:13px" ')}${m.category} · ${m.location}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><span class="card-footer"><span>${save.completed.includes(m.id) ? '✓ Story told' : 'Prototype assignment'}</span><span>+ ${m.reward} XP →</span></span></button>`).join('')}</div>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(b => b.onclick = () => { boardCategory = b.dataset.category as typeof boardCategory; openBoard(); });
  modal.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach(b => b.onclick = () => { selectMission(missions.find(m => m.id === b.dataset.mission)!); modal.close(); toast('Assignment accepted. Walk there or use “Find the spot”.'); });
}
function openJournal() {
  showModal('Your way of seeing.', 'THE PHOTO JOURNAL', `${save.photos.length} photographs collected · ${save.completed.length} stories told. The latest 16 photos are kept on this device.`, save.photos.length ? `<div class="journal-grid">${save.photos.map(p => { const m = missions.find(m => m.id === p.missionId)!; return `<button class="photo-card" data-photo="${p.id}"><img src="${esc(p.image)}" alt="Your photograph for ${esc(m.title)}"/><h3>${esc(m.title)}</h3><p>${m.category} · ${p.result.passed ? '✓ Assignment complete' : 'A work in progress'} · ${p.result.score}/100</p></button>`; }).join('')}</div>` : `<div class="empty">${icon('camera')}<h3>Every photographer starts here.</h3><p>Explore the world, find something worth noticing,<br/>and press C to make your first photograph.</p></div>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(b => b.onclick = () => openReview(save.photos.find(p => p.id === b.dataset.photo)!));
}
function openReview(photo: Photo) {
  const m = missions.find(m => m.id === photo.missionId)!;
  const { result, settings: s } = photo;
  showModal(result.passed ? 'A story worth keeping.' : 'One frame closer.', 'IN THE DARKROOM', `${m.title} · ${m.location}`, `
    <div class="review-layout"><div><img class="review-photo" src="${esc(photo.image)}" alt="Your captured photograph"/><div class="photo-settings"><span>${shutterLabel(s.shutter)}${s.shutter < 0.25 ? ' s' : ''}</span><span>f/${s.aperture}</span><span>ISO ${s.iso}</span><span>${s.filter === 'nd6' ? 'ND64' : s.filter === 'cpl' ? 'Polarizer' : 'No filter'}</span>${s.tripod ? '<span>Tripod</span>' : ''}${s.panning ? '<span>Panning</span>' : ''}${flashPower(s) > 0 ? `<span>Flash ${flashPower(s) === 1 ? 'full' : `1/${Math.round(1 / flashPower(s))}`} ${flashCanFire(s) ? '' : '(not synced)'}</span>` : ''}${photo.studio ? `<span>Studio: ${lightNames.map(n => `${n} ${photo.studio![n].enabled ? Math.round(photo.studio![n].power * 100) : 0}%`).join(' · ')}</span>` : ''}</div><p style="font-size:9px;color:#8b927b;line-height:1.6;margin-top:14px">Exposure and lighting falloff are calculated. Blur, noise, and optical effects are simplified teaching cues in this prototype.</p></div>
    <div><div class="review-score">${result.score}<small> / 100</small></div><p class="review-verdict">${result.passed ? `Assignment complete · ${m.reward} XP earned once` : 'Keep exploring. Every attempt teaches you something.'}</p>${result.feedback.map(f => `<div class="feedback-row ${f.passed ? '' : 'missed'}"><span class="feedback-icon">${icon(f.passed ? 'check' : 'info')}</span><div><strong>${esc(f.label)}</strong><p>${esc(f.text)}</p></div></div>`).join('')}</div></div>
    <div class="review-actions"><a class="secondary" id="download-photo" style="text-decoration:none;color:inherit" href="${esc(photo.image)}" download="willowbrook-${m.id}-${photo.date}.jpg">${icon('download')}Keep a copy</a><button class="primary" id="review-next">${result.passed ? 'Find another story' : 'Try another frame'}${icon('arrow')}</button></div>`);
  $('review-next').onclick = () => { if (result.passed) { boardCategory = 'All'; openBoard(); } else { modal.close(); setCameraMode(true); } };
}

function drawMap(canvas: HTMLCanvasElement, large = false) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const mx = (x: number) => (x + 55) / 110 * w, mz = (z: number) => (z + 55) / 110 * h;
  ctx.fillStyle = '#ced7b6'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#99af84'; ctx.fillRect(0, 0, w, h * 0.22);
  ctx.fillStyle = '#a6bc94'; ctx.fillRect(0, h * 0.22, w * 0.12, h * 0.78); ctx.fillRect(w * 0.9, h * 0.22, w * 0.1, h * 0.78);
  ctx.strokeStyle = '#e7e1c7'; ctx.lineWidth = large ? 12 : 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx(-44), mz(16)); ctx.lineTo(mx(43), mz(16)); ctx.moveTo(mx(15), mz(-38)); ctx.lineTo(mx(15), mz(32)); ctx.moveTo(mx(-35), mz(25)); ctx.lineTo(mx(5), mz(25)); ctx.moveTo(mx(-4), mz(-42)); ctx.lineTo(mx(-4), mz(-16)); ctx.stroke();
  ctx.fillStyle = '#85aaa0'; ctx.beginPath(); ctx.roundRect(mx(-21), mz(-14.5), 28 / 110 * w, 23 / 110 * h, w * 0.025); ctx.fill();
  ctx.fillStyle = '#b9aa88'; ctx.fillRect(mx(-1.5), mz(3.5), 3 / 110 * w, 10 / 110 * h);
  ctx.fillStyle = '#c2997e'; ctx.fillRect(mx(19), mz(-3), 20 / 110 * w, 17 / 110 * h);
  ctx.fillStyle = '#b9bd9c'; ctx.fillRect(mx(24), mz(-29), 12 / 110 * w, 8 / 110 * h); ctx.fillRect(mx(8.5), mz(-17), 9 / 110 * w, 6 / 110 * h);
  ctx.fillStyle = '#b7c299'; ctx.fillRect(mx(-30), mz(22), 14 / 110 * w, 9 / 110 * h);
  const pos = subjectPosition(world, activeMission);
  for (const m of missions.filter((m, i) => i % 2 === 0)) {
    const p = m.category === activeMission.category ? pos : new THREE.Vector3(...m.position);
    ctx.beginPath(); ctx.arc(mx(p.x), mz(p.z), large ? 6 : 4, 0, Math.PI * 2); ctx.fillStyle = m.category === activeMission.category ? '#bdb655' : '#8c9d70'; ctx.fill();
    if (large) { ctx.fillStyle = '#4d6145'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(m.location, mx(p.x), mz(p.z) - 12); }
  }
  ctx.save(); ctx.translate(mx(player.x), mz(player.z)); ctx.rotate(-yaw);
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-5, 6); ctx.lineTo(0, 3); ctx.lineTo(5, 6); ctx.closePath(); ctx.fillStyle = '#314e40'; ctx.fill(); ctx.restore();
}
function openMap() {
  showModal('A small town. A lot to notice.', 'EXPLORE WILLOWBROOK', 'You are the green arrow. Choose a place below to take a travel shortcut.', `<canvas id="large-map" class="map-large" width="680" height="420"></canvas><div class="map-legend">${categories.map(c => `<button data-place="${c}">${icon(categoryIcon[c])}${missions.find(m => m.category === c)!.location}<span style="margin-left:auto">→</span></button>`).join('')}</div>`);
  drawMap($<HTMLCanvasElement>('large-map'), true);
  modal.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b => b.onclick = () => { const m = missions.find(m => m.category === b.dataset.place)!; selectMission(m); travelTo(m); modal.close(); });
}
function openHelp() {
  showModal('Take your time. Look around.', 'WELCOME TO WILLOWBROOK', 'An early prototype about learning the craft, one photograph at a time.', `<div class="help-grid">
    <div class="help-card"><strong>Wander and frame</strong><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> move faster.<br/>Drag the world to look around. Arrow keys also aim. Scroll over the world to zoom. <kbd>E</kbd> raises the viewfinder.</div>
    <div class="help-card"><strong>Make a photograph</strong>Choose shutter speed, aperture, ISO, and a filter beneath the world. <kbd>C</kbd> takes a photo. <kbd>T</kbd> unfolds the tripod. The light meter should sit near zero.</div>
    <div class="help-card"><strong>Find your next story</strong><kbd>Q</kbd> assignments · <kbd>M</kbd> map · <kbd>J</kbd> journal.<br/>Accept an assignment, then explore or use “Find the spot”. Suggested settings are available for experimenting.</div>
    <div class="help-card"><strong>Learn from the frame</strong>A photo is assessed for composition, exposure, and the assignment's lesson. Read the feedback and try again. Higher ISO is often the right choice when a moment moves fast.</div>
    <div class="help-card"><strong>Shape the light</strong><kbd>L</kbd> opens the Lighting kit; <kbd>F</kbd> toggles flash. Adjust manual flash power or visit the studio to move and tune key, fill, and rim lights. A brief flash favours close subjects; shutter speed controls the ambient within the 1/250 s sync limit.</div>
    <div class="help-card"><strong>Your little collection</strong>Progress and the latest 16 photographs save in this browser on this device. Download favourites from the darkroom. This prototype is designed for a desktop keyboard and mouse.</div>
  </div><div class="review-actions"><button class="secondary" id="new-notebook">Start a fresh notebook</button><button class="primary" id="begin-explore">Let’s find the light ${icon('arrow')}</button></div>`);
  $('begin-explore').onclick = () => modal.close();
  $('new-notebook').onclick = openNewNotebook;
}

function openNewNotebook() {
  showModal('A fresh roll of film.', 'YOUR FIELD NOTEBOOK', 'Start again with empty progress and a fresh journal. The previous notebook is backed up on this device first.', `<div class="help-card">Your current ${save.photos.length} photographs and ${save.completed.length} completed assignments will be kept in a backup. You can restore that backup from this screen. Starting fresh replaces any older backup.</div><div class="review-actions"><button class="secondary" id="restore-notebook">Restore previous notebook</button><button class="primary" id="confirm-new-notebook">Back up and start fresh ${icon('arrow')}</button></div>`);
  $('restore-notebook').onclick = () => {
    try {
      const backup = localStorage.getItem(`${storageKey}-backup`);
      if (!backup) { toast('There is no previous notebook to restore yet.'); return; }
      localStorage.setItem(storageKey, backup); location.reload();
    } catch { toast('Your browser could not restore the notebook.'); }
  };
  $('confirm-new-notebook').onclick = () => {
    try { localStorage.setItem(`${storageKey}-backup`, JSON.stringify(save)); }
    catch { toast('The backup could not be saved. Your current notebook has been kept.'); return; }
    save.completed = []; save.photos = []; activeMission = missions[0];
    settings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0 }; studioRig = defaultStudioRig();
    selectMission(activeMission); player.set(...activeMission.viewpoint); camera.fov = 55; camera.updateProjectionMatrix(); faceSubject(activeMission); syncSettings(); updateLensLabel(); modal.close();
    toast('A fresh notebook. Your previous photographs are safely backed up on this device.');
  };
}

function updateLensLabel() {
  const cropY = Math.min(1, camera.aspect / 1.5);
  const focal = Math.round(24 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cropY));
  $('lens-label').textContent = String(focal); $('bar-lens').textContent = String(focal);
}

for (const key of ['shutter', 'aperture', 'iso'] as const) $<HTMLSelectElement>(key).addEventListener('change', e => { settings[key] = Number((e.target as HTMLSelectElement).value); updateExposure(); });
$<HTMLSelectElement>('filter').addEventListener('change', e => { settings.filter = (e.target as HTMLSelectElement).value as CameraSettings['filter']; updateExposure(); });
for (const key of ['tripod', 'panning'] as const) $(key).onclick = () => { settings[key] = !settings[key]; syncSettings(); if (key === 'tripod') toast(settings.tripod ? 'Tripod set. Your camera stays here until you pack it away.' : 'Tripod packed. Ready to wander.'); };
$('capture').onclick = capture;
$('lighting-kit').onclick = toggleLightingKit;
$('flash-toggle').onclick = () => { settings.flashPower = flashPower(settings) > 0 ? 0 : 0.25; syncSettings(); if (lightingOpen) renderLightingPanel(); persist(); toast(flashPower(settings) > 0 ? 'Flash set to 1/4 power. Open Lighting for power controls and a subject reading.' : 'Flash off.'); };
$('camera-mode').onclick = () => setCameraMode(true); $('explore-mode').onclick = () => setCameraMode(false);
$('nav-world').onclick = () => { if (modal.open) modal.close(); setCameraMode(false); };
$('nav-board').onclick = openBoard; $('nav-journal').onclick = openJournal; $('nav-help').onclick = openHelp;
$('minimap-button').onclick = openMap;
$('quality').onclick = () => {
  lowQuality = !lowQuality; renderer.setPixelRatio(lowQuality ? 1 : Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = !lowQuality; renderer.shadowMap.needsUpdate = true; resize();
  $('quality').textContent = `Quality: ${lowQuality ? 'performance' : 'balanced'}`;
  toast(lowQuality ? 'Performance mode: lower resolution and shadows off.' : 'Balanced mode: soft lighting and shadows.');
};
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close(); } });
modal.addEventListener('close', () => { keys.clear(); drag = false; });
document.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('select,input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (modal.open || capturing) return;
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'shift', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) { e.preventDefault(); keys.add(key); }
  if (e.repeat) return;
  if (key === 'c') { e.preventDefault(); capture(); }
  if (key === 'e') { e.preventDefault(); setCameraMode(!cameraMode); }
  if (key === 't') $('tripod').click();
  if (key === 'f') $('flash-toggle').click();
  if (key === 'l') toggleLightingKit();
  if (key === 'q') openBoard();
  if (key === 'j') openJournal();
  if (key === 'm') openMap();
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); drag = false; });
document.addEventListener('visibilitychange', () => { keys.clear(); drag = false; });
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0 || modal.open || capturing) return;
  drag = true; lastPointerX = e.clientX; lastPointerY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag || modal.open || capturing) return;
  yaw -= (e.clientX - lastPointerX) * 0.004;
  pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastPointerY) * 0.003, -1.3, 1.3);
  lastPointerX = e.clientX; lastPointerY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', () => { drag = false; });
renderer.domElement.addEventListener('pointercancel', () => { drag = false; });
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault(); camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.02, 28, 75); camera.updateProjectionMatrix();
  updateLensLabel();
}, { passive: false });
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); keys.clear(); toast('Graphics were interrupted. Reload to return to your saved journal.'); });

world.setNight(activeMission.category === 'Astro'); applyStudioRig(); world.update(0, settings); world.scene.updateMatrixWorld(true);
faceSubject(activeMission); renderMission(); syncSettings(); updateProgress(); resize(); updateLensLabel();
renderer.shadowMap.needsUpdate = true;
let previousTime = performance.now(), lastMapTime = 0, frameCount = 0, fpsTime = performance.now();
function animate(now: number) {
  const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
  if (!modal.open && !capturing) {
    elapsed += dt;
    if (keys.has('arrowleft')) yaw += dt; if (keys.has('arrowright')) yaw -= dt;
    if (keys.has('arrowup')) pitch = Math.min(1.3, pitch + dt * 0.7); if (keys.has('arrowdown')) pitch = Math.max(-1.3, pitch - dt * 0.7);
    if (!settings.tripod) {
      const forward = Number(keys.has('w')) - Number(keys.has('s')), side = Number(keys.has('d')) - Number(keys.has('a'));
      const length = Math.hypot(forward, side) || 1, speed = (keys.has('shift') ? 8 : 4.5) * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / length * speed;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / length * speed;
      if (world.canWalk(player.x + dx, player.z)) player.x += dx;
      if (world.canWalk(player.x, player.z + dz)) player.z += dz;
    }
    world.update(elapsed, settings);
  }
  updateCamera(); world.scene.updateMatrixWorld(true);
  const p = subjectPosition(world, activeMission); const distance = p.distanceTo(player); p.project(camera);
  const marker = $('target-marker');
  marker.style.display = p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9 ? '' : 'none';
  marker.style.left = `${(p.x * 0.5 + 0.5) * 100}%`; marker.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
  $('target-label').textContent = `${activeMission.subject} · ${Math.round(distance)} m`;
  $('compass-arrow').style.transform = `rotate(${yaw * 180 / Math.PI}deg)`;
  applyCameraLight(settings);
  if (now - lastMapTime > 150) {
    drawMap($<HTMLCanvasElement>('minimap')); updateExposure(); lastMapTime = now;
    if (flashCanFire(settings) && (cameraMode || lightingOpen)) renderer.shadowMap.needsUpdate = true;
  }
  renderer.render(world.scene, camera);
  frameCount++;
  if (now - fpsTime > 1500) { $('fps').textContent = `· ${Math.round(frameCount * 1000 / (now - fpsTime))} fps`; frameCount = 0; fpsTime = now; }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.setTimeout(() => { if (save.photos.length === 0) toast('Welcome to Willowbrook. Drag to look, WASD to walk. Your first story is waiting.'); }, 800);

import * as THREE from 'three';
import { categories, missions, type Category, type Mission } from './missions.ts';
import { assessPhoto, exposureStops, shutterLabel, type Assessment, type CameraSettings, type Framing } from './photography.ts';
import { createWorld, subjectPosition } from './world.ts';
import { defaultStudioRig, normalizeStudioRig, lightNames, studioExposureOffset, flashCanFire, flashPower, flashRenderIntensity, subjectExposureStops, type StudioRig } from './lighting.ts';
import { adjustCameraSetting, shutterValues, apertureValues, isoValues, TripodState } from './controls.ts';
import { createTripodView } from './tripod.ts';
import { WorldClock, sampleSky, formatTime, missionAmbientEV, missionReferenceHour, isMissionTime, wrapHour } from './environment.ts';
import { gearCatalog, money, normalizeCompleted, normalizeEconomy, ownsGear, balance, earnedMoney, purchaseGear, completeMission, captureCount, focalRange, zoomFocal, fovForFocal, CaptureSequence, normalizeLens, type LensId, type Economy, type GearId } from './economy.ts';
import { WORLD_HALF, terrainHeight, trails } from './terrain.ts';
import { npcCatalog, npcPosition, nearestNPC, normalizeDiscovered, discoverNPC, canAcceptMission, missionGearReady, type NPC } from './exploration.ts';
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
  burst: '<path d="M3 6h14v12H3zM7 3h13v12M7 21h14v-9"/>',
  shop: '<path d="M3 9h18l-2-6H5L3 9ZM5 9v12h14V9M9 21v-7h6v7"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.camera}</svg>`;
const categoryIcon: Record<Category, string> = { Nature: 'mountain', Sports: 'sports', News: 'book', Wedding: 'heart', Studio: 'studio', Astro: 'moon' };
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Photo { payment?: number; burst?: { id: string; index: number; total: number }; id: string; missionId: string; image: string; settings: CameraSettings; result: Assessment; date: number; studio?: StudioRig; environment?: { hour: number; cloudCover: number } }
interface Save { discovered: string[]; lens?: LensId; version: 1; completed: string[]; photos: Photo[]; active: string; hour?: number; focalLength?: number; economy: Economy; lighting?: { flashPower: number; studio: StudioRig } }
const playtest = new URLSearchParams(location.search).get('playtest');
const storageKey = playtest === null ? 'the-photographer-save-v1' : `the-photographer-playtest${playtest && playtest !== '1' ? `-${playtest.slice(0,32)}` : ''}-v1`;
let storageAvailable = true;
function loadSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (raw?.version === 1) {
      const completed = normalizeCompleted(raw.completed);
      return {
      version: 1,
      completed,
      discovered: normalizeDiscovered(raw.discovered, [...completed, raw.active, ...(Array.isArray(raw.photos) ? raw.photos.map((p: Photo) => p?.missionId) : [])]),
      lens: raw.lens,
      economy: normalizeEconomy(raw.economy, completed, raw.lighting?.flashPower > 0 || (Array.isArray(raw.photos) && raw.photos.some((p: Photo) => (p?.settings?.flashPower ?? 0) > 0))),
      focalLength: Number.isFinite(raw.focalLength) ? raw.focalLength : undefined,
      active: missions.some(m => m.id === raw.active) ? raw.active : missions[0].id,
      hour: Number.isFinite(raw.hour) ? wrapHour(raw.hour) : undefined,
      lighting: { flashPower: flashPower({ flashPower: raw.lighting?.flashPower } as CameraSettings), studio: normalizeStudioRig(raw.lighting?.studio) },
      photos: Array.isArray(raw.photos) ? raw.photos.filter((p: Photo) => missions.some(m => m.id === p.missionId) && typeof p.image === 'string' && /^data:image\/jpeg;base64,/.test(p.image) && p.image.length < 800000 && p.settings && p.result && Array.isArray(p.result.feedback)).slice(0, 16) : [],
    };
    }
  } catch { storageAvailable = false; }
  return { version: 1, discovered: normalizeDiscovered(undefined), completed: [], photos: [], active: missions[0].id, economy: normalizeEconomy(undefined, []) };
}
const save = loadSave();
let activeMission = missions.find(m => m.id === save.active && canAcceptMission(m, save.discovered, save.economy)) ?? missions[0];
const clock = new WorldClock(save.hour ?? missionReferenceHour(activeMission));
let meditation: { start: number; distance: number; elapsed: number; target: number } | null = null;
let lastClockSave = 0;
let equippedLens = normalizeLens(save.lens, save.economy);
let focalLength = THREE.MathUtils.clamp(save.focalLength ?? 35, ...focalRange(save.economy, equippedLens));
let settings: CameraSettings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: ownsGear(save.economy, 'flash') ? save.lighting?.flashPower ?? 0 : 0 };
let studioRig = normalizeStudioRig(save.lighting?.studio);
let lightingOpen = false;
let lightingMode: 'flash' | 'studio' = 'flash';
let cameraMode = false;
let lowQuality = false;
let boardCategory: Category | 'All' = 'All';
let capturing = false;
const captureSequence = new CaptureSequence();
let shotSettings: CameraSettings | null = null;
let shotPhotos: Photo[] = [];
let shotPayment = 0;
let shotId = '';
let shootReadyAt = 0;
let lastGearHint = -Infinity;
let toastTimer = 0;

const tripod = new TripodState();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let tripodSettle = 0;
let previewTimer = 0;
let modalView: 'menu' | 'page' = 'page';
const options = (values: number[], label: (v: number) => string, selected: number) => values.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${label(v)}</option>`).join('');

$('app').innerHTML = `
  <main class="workspace">
    <section class="stage" id="stage" aria-label="Interactive 3D photography world">
      <div class="scene-location"><span id="time-icon">${icon('sun')}</span><div><strong><span id="location-title"></span><span id="clock-label"></span></strong><small id="subject-cue"></small></div></div>
      <button class="menu-button" id="menu-button" aria-label="Open pause menu (Escape)" title="Assignments, journal, map and controls (Esc)"><span>Esc</span></button>
      <aside id="lighting-panel" class="lighting-panel" aria-label="Lighting kit" hidden></aside>
      <div class="target-marker" id="target-marker"><span></span><small id="target-label"></small></div>
      <div class="viewfinder" id="viewfinder"><span class="finder-meta"><span id="lens-label">35</span> MM · <span id="lens-type">PRIME</span> · 3:2</span><span class="focus-point"></span></div>
      <div class="meditation-overlay" id="meditation-overlay" hidden><div>${icon('moon')}<p>Meditating…</p><strong id="meditation-time"></strong><small>Esc to return</small></div></div>
      <button class="npc-prompt" id="npc-prompt" hidden></button>
      <div class="flash" id="flash"></div>
      <button id="capture-preview" class="capture-preview" aria-label="Review latest photograph" hidden></button>
      <section class="camera-bar" aria-label="Manual camera settings">
        <div class="setting" title="Shutter: 1 slower / 2 faster"><label for="shutter">SHUTTER <small>1 / 2</small></label><select id="shutter">${options(shutterValues, shutterLabel, settings.shutter)}</select></div>
        <div class="setting" title="Aperture: 3 wider / 4 narrower"><label for="aperture">APERTURE <small>3 / 4</small></label><select id="aperture">${options(apertureValues, v => `f/${v}`, settings.aperture)}</select></div>
        <div class="setting" title="ISO: 5 lower / 6 higher"><label for="iso">ISO <small>5 / 6</small></label><select id="iso">${options(isoValues, String, settings.iso)}</select></div>
        <div class="setting filter-setting"><label for="filter">FILTER</label><select id="filter"><option value="none">—</option><option value="nd6">ND64</option><option value="cpl">CPL</option></select></div>
        <div class="equipment">
          <button id="camera-mode" aria-label="Toggle viewfinder (E)" aria-pressed="false" title="Viewfinder (E)">${icon('camera')}</button>
          <button id="tripod" aria-label="Deploy tripod (T)" aria-pressed="false" title="Deploy tripod (T)">${icon('tripod')}</button>
          <button id="panning" aria-label="Toggle panning" aria-pressed="false" title="Panning">${icon('move')}</button>
          <button id="flash-toggle" aria-label="Toggle camera flash (F)" aria-pressed="false" title="Flash (F)">${icon('bolt')}</button>
          <button id="burst-mode" aria-label="Unlock burst camera in gear shop" aria-pressed="false" title="Burst camera (B)">${icon('burst')}</button>
          <button id="lighting-kit" aria-label="Open lighting kit (L)" aria-expanded="false" title="Lighting kit (L)">${icon('studio')}</button>
        </div>
        <div class="exposure" title="Ambient exposure meter"><strong id="ev-label"></strong><div class="meter">${Array.from({ length: 11 }, () => '<i></i>').join('')}<span class="needle" id="meter-needle"></span></div></div>
        <button id="capture" class="shutter-button" aria-label="Take a photograph (C)" title="Take a photograph (C)"><span></span></button>
      </section>
    </section>
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
const tripodView = createTripodView();
const camera = new THREE.PerspectiveCamera(fovForFocal(focalLength, 1), 1, 0.1, 450);
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
  save.active = activeMission.id; save.hour = clock.hour; save.focalLength = focalLength; save.lens = equippedLens;
  save.lighting = { flashPower: flashPower(settings), studio: normalizeStudioRig(studioRig) };
  try { localStorage.setItem(storageKey, JSON.stringify(save)); storageAvailable = true; }
  catch {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...save, photos: save.photos.slice(0, 4) })); storageAvailable = true; toast('Storage is nearly full. The four newest photos and your progress were saved.'); }
    catch { storageAvailable = false; toast('Your browser could not save progress. Photos remain available during this session.'); }
  }
  updateProgress();
}
function updateProgress() {
  if (!$('menu-progress')) return;
  const xp = missions.filter(m => save.completed.includes(m.id)).reduce((total, m) => total + m.reward, 0);
  $('menu-progress').textContent = `${save.completed.length}/${missions.length} assignments · ${save.discovered.length} discovered · ${save.photos.length} photos · ${xp} XP · ${money(balance(save.economy, save.completed))}`;
  $('save-status').textContent = storageAvailable ? 'Saved on this device' : 'Saving unavailable · This session only';
}
function renderMission() {
  $('location-title').textContent = activeMission.location;
  $('subject-cue').textContent = `${activeMission.subject} · R to talk to locals`;
  updateClockCue();
}
function requestTripod(deployed: boolean, immediate = reducedMotion.matches) {
  tripod.request(deployed, immediate); tripodSettle = 0;
  settings.tripod = tripod.deployed;
  syncSettings();
}
function syncTripod() {
  const button = $('tripod');
  button.classList.toggle('on', tripod.target === 1);
  button.classList.toggle('setting-up', tripod.transitioning);
  button.setAttribute('aria-pressed', String(tripod.target === 1));
  button.setAttribute('aria-busy', String(tripod.transitioning));
  const label = tripod.transitioning ? (tripod.target ? 'Setting up tripod' : 'Packing tripod') : (tripod.deployed ? 'Pack tripod' : 'Deploy tripod');
  button.setAttribute('aria-label', `${label} (T)`); button.title = `${label} (T)`;
  $<HTMLButtonElement>('capture').disabled = tripod.transitioning || capturing || !!meditation || performance.now() < shootReadyAt;
  for (const id of ['shutter', 'aperture', 'iso', 'filter', 'tripod', 'panning', 'flash-toggle', 'burst-mode', 'lighting-kit']) ($<HTMLButtonElement | HTMLSelectElement>(id)).disabled = capturing;
}
function suggestSettings() {
  if (activeMission.requiredGear && !missionGearReady(activeMission, save.economy)) { openGearShop(); return; }
  if (activeMission.recommended.focalLength) { equipLens('telephoto'); focalLength = activeMission.recommended.focalLength; updateLensProjection(); }
  settings = { ...activeMission.recommended, flashPower: 0 };
  requestTripod(settings.tripod);
  if (activeMission.category === 'Studio') { studioRig = defaultStudioRig(); applyStudioRig(); }
  syncSettings(); if (lightingOpen) renderLightingPanel(); persist();
  modal.close(); toast('Suggested settings applied.');
}
function openPauseMenu() {
  const m = activeMission; persist();
  showModal('The Photographer', 'PAUSED', '', `
    <div class="pause-assignment"><span class="eyebrow">${m.category} · ${money(m.payment)} ${save.completed.includes(m.id) ? 'paid' : 'payment'} · ${save.completed.includes(m.id) ? 'Completed' : 'Current assignment'}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>
      ${m.timeWindow ? `<p class="mission-time ${isMissionTime(m, clock.hour) ? 'ready' : 'waiting'}">${esc(m.timeWindow.label)} · ${isMissionTime(m, clock.hour) ? 'Ready now' : 'Wait for the light'}</p>` : ''}<details><summary>Field notes</summary><p>${esc(m.lesson)}</p></details>
      <div class="pause-actions"><button class="secondary" id="travel">${icon('pin')}Find the spot</button><button class="secondary" id="suggest">Suggested settings</button></div>
    </div>
    <div class="pause-grid"><button id="menu-board">${icon('flag')}Assignments</button><button id="menu-journal">${icon('book')}Photo journal</button><button id="menu-map">${icon('map')}World map</button><button id="menu-help">${icon('info')}Controls</button><button id="menu-shop">${icon('shop')}Gear shop · ${money(balance(save.economy, save.completed))}</button><button id="menu-lighting">${icon('studio')}Lighting kit</button><button id="quality">${icon('sun')}Quality: ${lowQuality ? 'performance' : 'balanced'}</button><button id="menu-meditate">${icon('moon')}Meditate · ${formatTime(clock.hour)}</button></div>
    <div class="pause-footer"><div><span id="menu-progress"></span><small id="save-status"></small></div><button class="primary" id="resume">Resume <kbd>Esc</kbd></button></div>`, 'menu');
  $('travel').onclick = () => { modal.close(); travelTo(m); };
  $('suggest').onclick = suggestSettings;
  $('menu-board').onclick = openBoard; $('menu-journal').onclick = openJournal;
  $('menu-shop').onclick = openGearShop;
  $('menu-meditate').onclick = openMeditation;
  $('menu-map').onclick = openMap; $('menu-help').onclick = openHelp;
  $('menu-lighting').onclick = () => { modal.close(); if (!lightingOpen) toggleLightingKit(); };
  $('quality').onclick = () => { toggleQuality(); openPauseMenu(); };
  $('resume').onclick = () => modal.close(); updateProgress();
}
function openGearShop() {
  const cash = balance(save.economy, save.completed);
  showModal('A little more possibility.', 'GEAR SHOP', 'Each assignment pays once. Spend your earnings on new ways to shoot.', `
    <div class="shop-wallet"><div><small>AVAILABLE</small><strong id="shop-balance">${money(cash)}</strong></div><span>${money(earnedMoney(save.completed))} earned · ${money(earnedMoney(save.completed) - cash)} spent</span></div>
    <div class="lens-picker"><span>Equipped lens</span>${(['prime', 'zoom', 'telephoto'] as const).filter(lens => lens === 'prime' || ownsGear(save.economy, lens)).map(lens => `<button class="secondary ${lens === equippedLens ? 'selected' : ''}" data-lens="${lens}">${lens === 'prime' ? '35 mm' : lens === 'zoom' ? '24–120 mm' : '200–600 mm'}${lens === equippedLens ? ' · Equipped' : ''}</button>`).join('')}</div>
    <div class="gear-grid">${gearCatalog.map(gear => {
      const owned = ownsGear(save.economy, gear.id), affordable = cash >= gear.price;
      return `<article class="gear-card"><div class="gear-icon">${icon(gear.icon)}</div><div><h3>${gear.name}</h3><p>${gear.description}</p><div class="gear-action">${owned ? `<span class="gear-owned">${icon('check')}${save.economy.gifted.includes(gear.id) ? 'Kept from your previous kit' : 'In your kit'}</span>${gear.id === 'burst' ? `<button class="secondary" id="shop-burst">${save.economy.burstEnabled ? 'Use single shots' : 'Use burst mode'}</button>` : ''}` : `<strong>${money(gear.price)}</strong><button class="${affordable ? 'primary' : 'secondary'}" data-buy="${gear.id}" ${affordable ? '' : 'disabled'}>${affordable ? `Buy · ${money(gear.price)}` : `Need ${money(gear.price - cash)} more`}</button>`}</div></div></article>`;
    }).join('')}</div><p class="starter-kit">Included: 35 mm lens, tripod, ND/CPL filters, and studio lights. Talk to locals to find new assignments. Bird close-ups require the wildlife lens; the other briefs use starter gear.</p>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(button => button.onclick = () => {
    const id = button.dataset.buy as GearId, purchase = purchaseGear(save.economy, save.completed, id);
    if (!purchase.ok) { toast(purchase.reason === 'funds' ? `Earn ${money(purchase.shortfall)} more.` : 'That gear is already in your kit.'); return; }
    save.economy = purchase.economy; if (id === 'zoom' || id === 'telephoto') equipLens(id); syncSettings(); updateLensLabel(); if (lightingOpen) renderLightingPanel(); persist(); openGearShop();
    toast(`${gearCatalog.find(g => g.id === id)!.name} added to your kit.`);
  });
  modal.querySelectorAll<HTMLButtonElement>('[data-lens]').forEach(button => button.onclick = () => { equipLens(button.dataset.lens as LensId); persist(); openGearShop(); });
  if ($('shop-burst')) $('shop-burst').onclick = () => { toggleBurst(); openGearShop(); };
}
function toggleBurst() {
  if (!ownsGear(save.economy, 'burst')) { openGearShop(); return; }
  save.economy.burstEnabled = !save.economy.burstEnabled; syncSettings(); persist();
}
function gearHint(message: string) {
  if (performance.now() - lastGearHint < 2500) return;
  lastGearHint = performance.now(); toast(message);
}
function updateClockCue() {
  const time = formatTime(clock.hour), phase = sampleSky(clock.hour).night > 0.5 ? 'moon' : 'sun';
  if ($('clock-label').textContent !== time) $('clock-label').textContent = time;
  if ($('time-icon').dataset.phase !== phase) { $('time-icon').innerHTML = icon(phase); $('time-icon').dataset.phase = phase; }
}
function openMeditation() {
  showModal('Wait for the light.', 'MEDITATION', `${formatTime(clock.hour)} now · One day takes 30 minutes of active play. Time pauses in menus.`, `
    <p class="meditation-note">Sit quietly and let the world turn. Camera settings and position stay as they are.</p>
    <div class="meditation-options"><button data-hour="${missionReferenceHour(activeMission)}" class="assignment-time">${icon('flag')}For this assignment <span>${formatTime(missionReferenceHour(activeMission))}${activeMission.timeWindow ? ` · ${esc(activeMission.timeWindow.label.split(' · ')[0])}` : ' · Afternoon'}</span></button>
      ${[[6.5,'Dawn'],[12,'Daylight'],[17,'Golden hour'],[23,'Night']].map(([hour,label]) => `<button data-hour="${hour}">${icon(hour === 23 ? 'moon' : 'sun')}${label}<span>${formatTime(Number(hour))}</span></button>`).join('')}
    </div>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.onclick = () => startMeditation(Number(button.dataset.hour)));
}
function startMeditation(target: number) {
  modal.close(); keys.clear(); drag = false;
  if (lightingOpen) toggleLightingKit();
  if (reducedMotion.matches) { clock.skipTo(target); finishMeditation(); return; }
  meditation = { start: clock.hour, distance: wrapHour(target - clock.hour), elapsed: 0, target };
  $('meditation-overlay').hidden = false; syncTripod();
}
function finishMeditation() {
  meditation = null; $('meditation-overlay').hidden = true;
  world.setTime(clock.hour); renderer.shadowMap.needsUpdate = true;
  updateClockCue(); updateExposure(); syncTripod(); persist();
}
function leaveModal() { if (modalView === 'menu') modal.close(); else openPauseMenu(); }
function toggleQuality() {
  lowQuality = !lowQuality;
  renderer.setPixelRatio(lowQuality ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !lowQuality; renderer.shadowMap.needsUpdate = true; resize();
}
function faceSubject(m: Mission) {
  const p = subjectPosition(world, m);
  const d = p.clone().sub(player);
  yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  updateCamera();
}
function travelTo(m: Mission) {
  if (!canAcceptMission(m, save.discovered, save.economy)) return;
  player.set(m.viewpoint[0], world.groundHeight(m.viewpoint[0], m.viewpoint[2]) + 1.7, m.viewpoint[2]); requestTripod(false, true);
  // Travel preserves manual exposure choices but packs the tripod away.
  syncSettings(); faceSubject(m); renderer.shadowMap.needsUpdate = true;
  toast(m.location);
}
function selectMission(m: Mission) {
  if (!save.discovered.includes(m.id)) { toast('Explore and talk to the locals to discover this assignment.'); return false; }
  if (!missionGearReady(m, save.economy)) { openGearShop(); return false; }
  activeMission = m; renderer.shadowMap.needsUpdate = true;
  lightingMode = m.category === 'Studio' ? 'studio' : 'flash';
  applyStudioRig(); setCameraMode(false); renderMission(); updateExposure(); persist(); if (lightingOpen) renderLightingPanel();
  return true;
}
function syncSettings() {
  if (!ownsGear(save.economy, 'flash')) settings.flashPower = 0;
  for (const key of ['shutter', 'aperture', 'iso', 'filter'] as const) $<HTMLSelectElement>(key).value = String(settings[key]);
  for (const key of ['panning'] as const) { $(key).classList.toggle('on', settings[key]); $(key).setAttribute('aria-pressed', String(settings[key])); }
  $('flash-toggle').classList.toggle('on', flashPower(settings) > 0); $('flash-toggle').setAttribute('aria-pressed', String(flashPower(settings) > 0));
  const flashOwned = ownsGear(save.economy, 'flash'), burstOwned = ownsGear(save.economy, 'burst');
  $('flash-toggle').classList.toggle('gear-locked', !flashOwned);
  $('flash-toggle').setAttribute('aria-label', flashOwned ? 'Toggle camera flash (F)' : 'Unlock flash in gear shop ($180)');
  $('flash-toggle').title = flashOwned ? 'Flash (F)' : 'Flash · $180 in gear shop';
  $('burst-mode').classList.toggle('gear-locked', !burstOwned);
  $('burst-mode').classList.toggle('on', save.economy.burstEnabled);
  $('burst-mode').setAttribute('aria-pressed', String(save.economy.burstEnabled));
  $('burst-mode').setAttribute('aria-label', burstOwned ? 'Toggle three-frame burst (B)' : 'Unlock burst camera in gear shop ($360)');
  $('burst-mode').title = burstOwned ? `Shooting: ${save.economy.burstEnabled ? '3-frame burst' : 'single'} (B)` : 'Burst camera · $360 in gear shop';
  renderer.shadowMap.needsUpdate = true;
  syncTripod(); updateExposure();
}
function sceneEV() {
  return missionAmbientEV(activeMission, clock.hour) + (activeMission.category === 'Studio' ? studioExposureOffset(studioRig, subjectPosition(world, activeMission).y) : 0);
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
  $('camera-mode').classList.toggle('selected', value); $('camera-mode').setAttribute('aria-pressed', String(value)); updateExposure();
}
function updateCamera() {
  player.y = world.groundHeight(player.x, player.z) + 1.7;
  camera.position.copy(player);
  const dip = !reducedMotion.matches && tripod.transitioning ? Math.sin(tripod.progress * Math.PI) : 0;
  camera.position.y -= dip * 0.07; camera.rotation.set(pitch - dip * 0.025, yaw, 0); camera.updateMatrixWorld();
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
  const timeOffset = missionAmbientEV(activeMission, clock.hour) - activeMission.ev;
  const renderedLightRatio = activeMission.category === 'Studio' ? 1 : sampleSky(clock.hour).lightLevel / sampleSky(missionReferenceHour(activeMission)).lightLevel;
  const stops = exposureStops(s, activeMission.ev) + timeOffset - Math.log2(renderedLightRatio);
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
  const power = flashPower(settings), flashOwned = ownsGear(save.economy, 'flash');
  $('lighting-panel').innerHTML = `<div class="lighting-heading"><div><div class="eyebrow">YOUR LIGHTING KIT</div><h2>Shape the light.</h2></div><button class="close" id="close-lighting" aria-label="Close lighting kit">${icon('close')}</button></div>
    <div class="lighting-mode-tabs"><button data-light-mode="flash" class="${lightingMode === 'flash' ? 'selected' : ''}">${icon('bolt')}Camera flash</button><button data-light-mode="studio" class="${lightingMode === 'studio' ? 'selected' : ''}">${icon('studio')}Studio lights</button></div>
    <div class="lighting-readings"><span>Ambient<strong id="lighting-ambient">—</strong></span><span>Subject<strong id="lighting-subject">—</strong></span></div>
    <div class="lighting-section" ${lightingMode === 'studio' ? 'hidden' : ''}><label class="light-select-label" for="flash-power">Manual flash power</label><select id="flash-power" ${flashOwned ? '' : 'disabled'}>${[0, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map(v => `<option value="${v}" ${v === power ? 'selected' : ''}>${v === 0 ? 'Off' : v === 1 ? 'Full power' : `1/${Math.round(1 / v)} power`}</option>`).join('')}</select>
      ${flashOwned ? '' : '<button class="secondary" id="unlock-flash">Unlock flash in gear shop · $180</button>'}<p class="lighting-note">A brief pulse lights nearby subjects most. Double the distance and only a quarter of the flash light reaches them. Preview shows the pulse as a steady light.</p>
      <p class="lighting-note" id="flash-sync-note"></p>
    </div>
    <div class="lighting-section" ${lightingMode === 'flash' ? 'hidden' : ''}>${activeMission.category !== 'Studio' ? '<p class="lighting-note">The lights are set up in Daylight Studio. Visit the pottery maker to see your adjustments.</p><button class="primary" id="visit-studio">Visit the studio →</button>' : '<p class="lighting-note">Continuous lights: shutter, aperture, and ISO all affect their exposure. Move a light closer to make its falloff stronger.</p>'}
      <div class="lighting-presets"><button data-light-preset="balanced">Balanced</button><button data-light-preset="dramatic">Dramatic</button><button data-light-preset="rim">Rim light</button><button data-light-preset="off">Lights off</button></div>${activeMission.category === 'Studio' ? (flashOwned ? '<button class="secondary flash-practice" id="flash-practice">Try a close flash portrait →</button>' : '<button class="secondary flash-practice" id="studio-unlock-flash">Unlock flash portrait practice · $180</button>') : ''}
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
  for (const id of ['unlock-flash', 'studio-unlock-flash']) if ($(id)) $(id).onclick = openGearShop;
  $('lighting-panel').querySelectorAll<HTMLButtonElement>('[data-light-mode]').forEach(button => button.onclick = () => { lightingMode = button.dataset.lightMode as typeof lightingMode; renderLightingPanel(); });
  if ($('flash-practice')) $('flash-practice').onclick = () => {
    if (!ownsGear(save.economy, 'flash')) { openGearShop(); return; }
    if (!selectMission(missions.find(m => m.id === 'studio-1')!)) return;
    for (const name of lightNames) studioRig[name].enabled = false;
    const target = subjectPosition(world, activeMission); player.set(target.x, 1.7, target.z + 3.5);
    settings = { shutter: 1 / 250, aperture: 4, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0.25 };
    requestTripod(false, true); applyStudioRig(); faceSubject(activeMission); setCameraMode(true); syncSettings(); persist(); lightingMode = 'flash'; renderLightingPanel();
    toast('Close subject, 1/4 flash, darker room. Change shutter speed and compare the ambient reading.');
  };
  $<HTMLSelectElement>('flash-power').onchange = e => { settings.flashPower = ownsGear(save.economy, 'flash') ? Number((e.target as HTMLSelectElement).value) : 0; syncSettings(); renderer.shadowMap.needsUpdate = true; persist(); };
  if ($('visit-studio')) $('visit-studio').onclick = () => { const m = missions.find(m => m.id === 'studio-1')!; if (selectMission(m)) travelTo(m); };
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
  renderer.setSize(width, height); camera.aspect = width / height; camera.fov = fovForFocal(focalLength, camera.aspect); camera.updateProjectionMatrix();
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
  const now = performance.now();
  if (modal.open || capturing || tripod.transitioning || meditation || now < shootReadyAt) return;
  if (activeMission.requiredGear && (!missionGearReady(activeMission, save.economy) || equippedLens !== 'telephoto')) { toast('Equip the 200–600 mm wildlife lens in Esc → Gear shop.'); return; }
  capturing = true; keys.clear(); shotPhotos = []; shotPayment = 0; shotId = crypto.randomUUID();
  shotSettings = { ...settings, focalLength };
  captureSequence.start(now, captureCount(save.economy)); syncTripod();
  captureFrame(now);
}
function captureFrame(now: number) {
  const shot = captureSequence.take(now);
  if (!shot) return;
  const captureSettings = { ...shotSettings! };
  updateCamera(); world.update(elapsed, captureSettings); world.scene.updateMatrixWorld(true);
  const frame = getFraming(), ambientEV = sceneEV();
  const result = assessPhoto(activeMission, captureSettings, frame, { hour: clock.hour, ambientEV, gearReady: missionGearReady(activeMission, save.economy) && (!activeMission.requiredGear || equippedLens === 'telephoto'), subjectStops: subjectExposureStops(captureSettings, ambientEV, frame.distance, activeMission.category !== 'Astro' && frame.visible && !frame.occluded) });
  const photo: Photo = { id: crypto.randomUUID(), missionId: activeMission.id, image: makePhoto(captureSettings, frame), settings: captureSettings, result, date: Date.now(), studio: activeMission.category === 'Studio' ? normalizeStudioRig(studioRig) : undefined, environment: { hour: clock.hour, cloudCover: sampleSky(clock.hour).cloudCover }, burst: shot.total > 1 ? { id: shotId, index: shot.index, total: shot.total } : undefined };
  const completion = completeMission(save.completed, activeMission.id, result.passed);
  save.completed = completion.completed; photo.payment = completion.payment; shotPayment += completion.payment;
  save.photos.unshift(photo); save.photos = save.photos.slice(0, 16); shotPhotos.push(photo);
  $('flash').classList.remove('fire'); void $('flash').offsetWidth; $('flash').classList.add('fire');
  if (shot.last) { shootReadyAt = now + (shot.total === 1 ? 300 : 100); finishShooting(); }
}
function finishShooting() {
  captureSequence.cancel(); capturing = false; syncTripod();
  if (!shotPhotos.length) return;
  persist(); renderMission();
  const best = shotPhotos.reduce((a,b) => b.result.score >= a.result.score ? b : a);
  const preview = $('capture-preview'); preview.hidden = false;
  const label = shotPhotos.length > 1 ? `Burst · ${shotPhotos.length} frames` : best.result.passed ? '✓ Assignment complete' : 'Photo saved';
  preview.innerHTML = `<img src="${esc(best.image)}" alt="${shotPhotos.length > 1 ? 'Best burst frame' : 'Latest photograph'}"/><span>${label} · ${best.result.score}/100${shotPayment ? ` · +${money(shotPayment)}` : ''}</span>`;
  preview.onclick = () => { preview.hidden = true; openReview(best); };
  window.clearTimeout(previewTimer); previewTimer = window.setTimeout(() => preview.hidden = true, 6000);
  shotPhotos = []; shotSettings = null;
}

function showModal(title: string, eyebrow: string, subtitle: string, content: string, view: 'menu' | 'page' = 'page') {
  if (capturing) finishShooting();
  modalView = view; keys.clear(); drag = false;
  modal.innerHTML = `<div class="modal-header"><div><div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="close" id="close-modal" aria-label="${view === 'menu' ? 'Resume game' : 'Back to pause menu'}">${icon('close')}</button></div><div class="modal-body">${content}</div>`;
  if (!modal.open) modal.showModal();
  $('close-modal').onclick = leaveModal;
}
function missionCard(m: Mission) {
  const ready = missionGearReady(m, save.economy);
  return `<button class="assignment-card ${ready ? '' : 'mission-locked'}" data-mission="${m.id}"><span class="eyebrow">${icon(categoryIcon[m.category])}${m.category} · ${esc(m.location)}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>${ready ? '' : '<p class="gear-requirement">Requires 200–600 mm lens · $480 · Open gear shop →</p>'}<span class="card-footer"><span>${save.completed.includes(m.id) ? '✓ Story told' : m.timeWindow ? esc(m.timeWindow.label) : 'Any time'}</span><span>${money(m.payment)} · ${m.reward} XP →</span></span></button>`;
}
function wireMissionCards() {
  modal.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach(b => b.onclick = () => {
    if (selectMission(missions.find(m => m.id === b.dataset.mission)!)) { modal.close(); toast('Assignment accepted · Esc for details.'); }
  });
}
function openBoard() {
  const known = missions.filter(m => save.discovered.includes(m.id));
  showModal('Your field notebook.', 'DISCOVERED ASSIGNMENTS', `${known.length} of ${missions.length} stories found. Walk the trails and press R near a local to hear about more.`, `<div class="discovery-note">Locals with a golden marker have stories to share. Look by the creek, track, square, garden, studio and northern ridge.</div><div class="category-tabs">${(['All', ...categories] as const).map(c => `<button data-category="${c}" class="${boardCategory === c ? 'active' : ''}">${c}</button>`).join('')}</div><div class="mission-grid">${known.filter(m => boardCategory === 'All' || m.category === boardCategory).map(missionCard).join('') || '<p class="discovery-note">No stories discovered here yet. Ask a local while exploring.</p>'}</div>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(b => b.onclick = () => { boardCategory = b.dataset.category as typeof boardCategory; openBoard(); });
  wireMissionCards();
}
function talkToNPC() {
  if (modal.open || capturing || meditation || tripod.transitioning) return;
  const npc = nearestNPC(player.x, player.y, player.z);
  if (!npc) return;
  const before = save.discovered.length;
  save.discovered = discoverNPC(save.discovered, npc); persist();
  showModal(npc.name, npc.role.toUpperCase(), `${save.discovered.length - before ? `${save.discovered.length - before} new stories added to your notebook` : 'A familiar face in Willowbrook'}`, `<p class="npc-dialogue">“${esc(npc.dialogue)}”</p><div class="mission-grid">${missions.filter(m => (npc.missions as readonly string[]).includes(m.id)).map(missionCard).join('')}</div><div class="review-actions"><span class="discovery-note">These stories stay in your notebook for later.</span><button class="primary" id="leave-npc">Keep exploring ${icon('arrow')}</button></div>`);
  wireMissionCards(); $('leave-npc').onclick = () => modal.close();
}
function updateNPCPrompt() {
  const npc: NPC | undefined = nearestNPC(player.x, player.y, player.z);
  const prompt = $('npc-prompt');
  prompt.hidden = !npc || modal.open || capturing || tripod.transitioning || !!meditation;
  if (npc && prompt.dataset.npc !== npc.id) { prompt.dataset.npc = npc.id; prompt.innerHTML = `<kbd>R</kbd> Talk to ${esc(npc.name)} <small>${esc(npc.role)}</small>`; }
}
function openJournal() {
  showModal('Your way of seeing.', 'THE PHOTO JOURNAL', `${save.photos.length} photographs collected · ${save.completed.length} stories told. The latest 16 photos are kept on this device.`, save.photos.length ? `<div class="journal-grid">${save.photos.map(p => { const m = missions.find(m => m.id === p.missionId)!; return `<button class="photo-card" data-photo="${p.id}"><img src="${esc(p.image)}" alt="Your photograph for ${esc(m.title)}"/><h3>${esc(m.title)}</h3><p>${m.category} · ${p.result.passed ? '✓ Assignment complete' : 'A work in progress'} · ${p.result.score}/100${p.burst ? ` · Burst ${p.burst.index}/${p.burst.total}` : ''}</p></button>`; }).join('')}</div>` : `<div class="empty">${icon('camera')}<h3>Every photographer starts here.</h3><p>Explore the world, find something worth noticing,<br/>and press C to make your first photograph.</p></div>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(b => b.onclick = () => openReview(save.photos.find(p => p.id === b.dataset.photo)!));
}
function openReview(photo: Photo) {
  const m = missions.find(m => m.id === photo.missionId)!;
  const { result, settings: s } = photo;
  showModal(result.passed ? 'A story worth keeping.' : 'One frame closer.', 'IN THE DARKROOM', `${m.title} · ${m.location}`, `
    <div class="review-layout"><div><img class="review-photo" src="${esc(photo.image)}" alt="Your captured photograph"/><div class="photo-settings"><span>${shutterLabel(s.shutter)}${s.shutter < 0.25 ? ' s' : ''}</span><span>f/${s.aperture}</span><span>ISO ${s.iso}</span>${s.focalLength ? `<span>${Math.round(s.focalLength)} mm</span>` : ''}${photo.burst ? `<span>Burst ${photo.burst.index}/${photo.burst.total}</span>` : ''}${Number.isFinite(photo.environment?.hour) ? `<span>${formatTime(photo.environment!.hour)} · ${Math.round(photo.environment!.cloudCover * 100)}% cloud cover</span>` : ''}<span>${s.filter === 'nd6' ? 'ND64' : s.filter === 'cpl' ? 'Polarizer' : 'No filter'}</span>${s.tripod ? '<span>Tripod</span>' : ''}${s.panning ? '<span>Panning</span>' : ''}${flashPower(s) > 0 ? `<span>Flash ${flashPower(s) === 1 ? 'full' : `1/${Math.round(1 / flashPower(s))}`} ${flashCanFire(s) ? '' : '(not synced)'}</span>` : ''}${photo.studio ? `<span>Studio: ${lightNames.map(n => `${n} ${photo.studio![n].enabled ? Math.round(photo.studio![n].power * 100) : 0}%`).join(' · ')}</span>` : ''}</div><p style="font-size:9px;color:#8b927b;line-height:1.6;margin-top:14px">Exposure and lighting falloff are calculated. Blur, noise, and optical effects are simplified teaching cues in this prototype.</p></div>
    <div><div class="review-score">${result.score}<small> / 100</small></div><p class="review-verdict">${result.passed ? `Assignment complete · ${photo.payment ? `${money(photo.payment)} paid` : 'Payment already earned'} · ${m.reward} XP` : 'Keep exploring. Every attempt teaches you something.'}</p>${result.feedback.map(f => `<div class="feedback-row ${f.passed ? '' : 'missed'}"><span class="feedback-icon">${icon(f.passed ? 'check' : 'info')}</span><div><strong>${esc(f.label)}</strong><p>${esc(f.text)}</p></div></div>`).join('')}</div></div>
    <div class="review-actions"><a class="secondary" id="download-photo" style="text-decoration:none;color:inherit" href="${esc(photo.image)}" download="willowbrook-${m.id}-${photo.date}.jpg">${icon('download')}Keep a copy</a><button class="primary" id="review-next">${result.passed ? 'Find another story' : 'Try another frame'}${icon('arrow')}</button></div>`);
  $('review-next').onclick = () => { if (result.passed) { boardCategory = 'All'; openBoard(); } else { modal.close(); setCameraMode(true); } };
}

function drawMap(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height;
  const mx = (x: number) => (x + WORLD_HALF) / (WORLD_HALF * 2) * w, mz = (z: number) => (z + WORLD_HALF) / (WORLD_HALF * 2) * h;
  for (let x = 0; x < w; x += 5) for (let z = 0; z < h; z += 5) {
    const height = terrainHeight(x / w * WORLD_HALF * 2 - WORLD_HALF, z / h * WORLD_HALF * 2 - WORLD_HALF);
    ctx.fillStyle = `hsl(${90 - height}, ${22 - height * 0.4}%, ${76 - height * 1.3}%)`; ctx.fillRect(x, z, 5, 5);
  }
  ctx.strokeStyle = '#eee0bc'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const trail of [...trails, [[-44,16],[43,16]], [[15,-38],[15,32]], [[-35,25],[5,25]]]) {
    ctx.beginPath(); trail.forEach(([x,z],i) => i ? ctx.lineTo(mx(x),mz(z)) : ctx.moveTo(mx(x),mz(z))); ctx.stroke();
  }
  ctx.fillStyle = '#85aaa0'; ctx.fillRect(mx(-21), mz(-14.5), 28 / 260 * w, 23 / 260 * h);
  ctx.beginPath(); ctx.ellipse(mx(76), mz(-54), 14 / 260 * w, 11 / 260 * h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  for (const [x,z,label] of [[0,30,'Willowbrook'],[-73,64,'Wildflower meadow'],[79,-80,'Eastern woodland'],[-53,-99,'Stargazer Ridge']] as const) { ctx.fillStyle = '#4d6145'; ctx.fillText(label,mx(x),mz(z)); }
  for (const npc of npcCatalog) {
    if (!npc.missions.some(id => save.discovered.includes(id))) continue;
    const [x,,z] = npcPosition(npc); ctx.beginPath(); ctx.arc(mx(x), mz(z), 4, 0, Math.PI * 2); ctx.fillStyle = '#b08b46'; ctx.fill(); ctx.fillText(npc.name, mx(x), mz(z) - 9);
  }
  const target = subjectPosition(world, activeMission); ctx.beginPath(); ctx.arc(mx(target.x),mz(target.z),5,0,Math.PI * 2);ctx.fillStyle='#dab955';ctx.fill();
  ctx.save(); ctx.translate(mx(player.x),mz(player.z));ctx.rotate(-yaw);
  ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,6);ctx.lineTo(0,3);ctx.lineTo(5,6);ctx.closePath();ctx.fillStyle='#314e40';ctx.fill();ctx.restore();
}
function openMap() {
  const known = missions.filter(m => save.discovered.includes(m.id) && missionGearReady(m, save.economy));
  showModal('Beyond the town.', 'EXPLORE WILLOWBROOK', '260 m across · Follow the pale trails into the hills and wetland. Green: you. Gold: current subject and locals you have met.', `<canvas id="large-map" class="map-large" width="680" height="560"></canvas><p class="discovery-note">Travel shortcuts appear for stories you have discovered. Explore on foot to meet new locals.</p><div class="map-legend">${known.map(m => `<button data-place="${m.id}">${icon(categoryIcon[m.category])}${esc(m.title)}<span style="margin-left:auto">→</span></button>`).join('')}</div>`);
  drawMap($<HTMLCanvasElement>('large-map'));
  modal.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b => b.onclick = () => { const m = missions.find(m => m.id === b.dataset.place)!; if (selectMission(m)) { travelTo(m); modal.close(); } });
}
function openHelp() {
  showModal('Take your time. Look around.', 'WELCOME TO WILLOWBROOK', 'An early prototype about learning the craft, one photograph at a time.', `<div class="help-grid">
    <div class="help-card"><strong>Wander and frame</strong><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> move faster.<br/>Drag the world to look around. Arrow keys also aim. The starter lens is fixed at 35 mm. Buy and equip a zoom or wildlife lens in the gear shop to use the scroll wheel or <kbd>− / +</kbd>. <kbd>E</kbd> raises the viewfinder.</div>
    <div class="help-card"><strong>Make a photograph</strong><kbd>1 / 2</kbd> slower / faster shutter.<br/><kbd>3 / 4</kbd> wider / narrower aperture.<br/><kbd>5 / 6</kbd> lower / higher ISO.<br/><kbd>C</kbd> takes a photo. With the burst camera, <kbd>B</kbd> toggles three-frame bursts at 5 fps. <kbd>T</kbd> sets or packs the tripod in a quick animation. Walk again once it is packed.</div>
    <div class="help-card"><strong>Find your next story</strong><kbd>Esc</kbd> opens the pause menu: assignments, journal, map and field notes. Press it again to resume. From a submenu, Esc returns to the pause menu.<br/>You start with one lighthouse assignment. Find locals with golden markers and press <kbd>R</kbd> to talk. Their stories are added to your notebook. Follow the trails into the hills and eastern wetland. Shortcuts become available for discovered assignments.</div>
    <div class="help-card"><strong>Learn from the frame</strong>A photo is assessed for composition, exposure, and the assignment's lesson. Click the brief thumbnail or open the journal to read feedback and try again. Higher ISO is often the right choice when a moment moves fast.</div>
    <div class="help-card"><strong>Shape the light</strong><kbd>L</kbd> opens the Lighting kit; <kbd>F</kbd> toggles purchased flash. Adjust manual flash power or visit the studio to move and tune key, fill, and rim lights. A brief flash favours close subjects; shutter speed controls the ambient within the 1/250 s sync limit.</div>
    <div class="help-card"><strong>Wait for the light</strong>The sun, clouds, exposure and stars change through a 30-minute day. Some assignments need a particular time. Open <kbd>Esc</kbd> → Meditate to skip ahead to dawn, daylight, golden hour, night or the assignment’s preferred time. Time pauses while menus are open.</div>
    <div class="help-card"><strong>Your little collection</strong>Assignments pay once. Open <kbd>Esc</kbd> → Gear shop for a zoom lens, camera flash, or burst camera. The 200–600 mm wildlife lens unlocks bird close-ups. Equip lenses in the shop; bird suggested settings also equip that lens.<br/>Progress and the latest 16 photographs save in this browser on this device. Download favourites from the darkroom. This prototype is designed for a desktop keyboard and mouse.</div>
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
    save.completed = []; save.discovered = normalizeDiscovered(undefined); save.photos = []; equippedLens = 'prime'; save.economy = normalizeEconomy(undefined, []); focalLength = 35; activeMission = missions[0];
    settings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0 }; studioRig = defaultStudioRig();
    clock.skipTo(17); world.setTime(clock.hour); requestTripod(false, true); selectMission(activeMission); player.set(...activeMission.viewpoint); camera.fov = fovForFocal(focalLength, camera.aspect); camera.updateProjectionMatrix(); faceSubject(activeMission); syncSettings(); updateLensLabel(); modal.close();
    toast('A fresh notebook. Your previous photographs are safely backed up on this device.');
  };
}

function updateLensLabel() {
  $('lens-label').textContent = String(Math.round(focalLength));
  $('lens-type').textContent = equippedLens === 'telephoto' ? 'WILDLIFE' : equippedLens === 'zoom' ? 'ZOOM' : 'PRIME';
}
function updateLensProjection() {
  camera.fov = fovForFocal(focalLength, camera.aspect); camera.updateProjectionMatrix(); updateLensLabel();
}
function equipLens(lens: LensId) {
  if (lens !== 'prime' && !ownsGear(save.economy, lens)) return;
  equippedLens = lens;
  focalLength = THREE.MathUtils.clamp(lens === 'telephoto' ? 200 : 35, ...focalRange(save.economy, lens));
  updateLensProjection();
}
function zoomCamera(delta: number) {
  if (equippedLens === 'prime') { gearHint('Equip a zoom or wildlife lens in Esc → Gear shop.'); return; }
  focalLength = zoomFocal(save.economy, focalLength, delta, equippedLens);
  updateLensProjection();
}

for (const key of ['shutter', 'aperture', 'iso'] as const) $<HTMLSelectElement>(key).addEventListener('change', e => { settings[key] = Number((e.target as HTMLSelectElement).value); updateExposure(); });
$<HTMLSelectElement>('filter').addEventListener('change', e => { settings.filter = (e.target as HTMLSelectElement).value as CameraSettings['filter']; updateExposure(); });
$('tripod').onclick = () => requestTripod(tripod.target === 0);
$('panning').onclick = () => { settings.panning = !settings.panning; syncSettings(); };
$('capture').onclick = capture;
$('npc-prompt').onclick = talkToNPC;
$('lighting-kit').onclick = toggleLightingKit;
$('flash-toggle').onclick = () => { if (!ownsGear(save.economy, 'flash')) { openGearShop(); return; } settings.flashPower = flashPower(settings) > 0 ? 0 : 0.25; syncSettings(); if (lightingOpen) renderLightingPanel(); persist(); };
$('burst-mode').onclick = toggleBurst;
$('camera-mode').onclick = () => setCameraMode(!cameraMode);
$('menu-button').onclick = openPauseMenu;
modal.addEventListener('cancel', e => { e.preventDefault(); leaveModal(); });
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) leaveModal(); } });
modal.addEventListener('close', () => { keys.clear(); drag = false; renderer.domElement.focus({ preventScroll: true }); });
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'escape') { e.preventDefault(); if (meditation) finishMeditation(); if (!e.repeat) { if (modal.open) leaveModal(); else openPauseMenu(); } return; }
  if ((e.target as HTMLElement).matches('select,input,textarea') || modal.open || meditation) return;
  if (capturing) { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(key); } return; }
  if (['-', '=', '+'].includes(key)) { e.preventDefault(); zoomCamera(key === '-' ? 100 : -100); return; }
  const adjustment = adjustCameraSetting(settings, e.code.startsWith('Digit') ? e.code.slice(5) : key);
  if (adjustment) { e.preventDefault(); settings = adjustment.settings; syncSettings(); return; }
  if (['w', 'a', 's', 'd', 'shift', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) { e.preventDefault(); keys.add(key); }
  if (e.repeat) return;
  if (key === 'r') { e.preventDefault(); talkToNPC(); }
  if (key === 'c') { e.preventDefault(); capture(); }
  if (key === 'e') { e.preventDefault(); setCameraMode(!cameraMode); }
  if (key === 't') { e.preventDefault(); $('tripod').click(); }
  if (key === 'b') { e.preventDefault(); toggleBurst(); }
  if (key === 'f') $('flash-toggle').click();
  if (key === 'l') toggleLightingKit();
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); drag = false; });
document.addEventListener('visibilitychange', () => { keys.clear(); drag = false; previousTime = performance.now(); if (document.hidden) { if (capturing) finishShooting(); persist(); } });
window.addEventListener('pagehide', () => { if (capturing) finishShooting(); persist(); });
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0 || modal.open || tripod.transitioning || meditation) return;
  drag = true; lastPointerX = e.clientX; lastPointerY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag || modal.open || tripod.transitioning || meditation) return;
  const sensitivity = Math.min(1, 35 / focalLength);
  yaw -= (e.clientX - lastPointerX) * 0.004 * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastPointerY) * 0.003 * sensitivity, -1.3, 1.3);
  lastPointerX = e.clientX; lastPointerY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', () => { drag = false; });
renderer.domElement.addEventListener('pointercancel', () => { drag = false; });
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault(); if (modal.open || capturing || meditation) return;
  zoomCamera(e.deltaY);
}, { passive: false });
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); keys.clear(); toast('Graphics were interrupted. Reload to return to your saved journal.'); });

world.setTime(clock.hour); applyStudioRig(); world.update(0, settings); world.scene.updateMatrixWorld(true);
faceSubject(activeMission); renderMission(); syncSettings(); updateProgress(); resize(); updateLensLabel();
renderer.shadowMap.needsUpdate = true;
let previousTime = performance.now(), lastMeterTime = 0;
function animate(now: number) {
  const realDt = document.hidden ? 0 : Math.max(0, (now - previousTime) / 1000);
  const dt = Math.min(realDt, 0.05); previousTime = now;
  if (meditation) {
    meditation.elapsed += realDt;
    const progress = Math.min(1, meditation.elapsed / 1.5);
    clock.skipTo(meditation.start + meditation.distance * (progress * progress * (3 - 2 * progress)));
    world.setTime(clock.hour); $('meditation-time').textContent = formatTime(clock.hour);
    if (progress === 1) { clock.skipTo(meditation.target); finishMeditation(); }
  } else if (!modal.open) {
    elapsed += dt; clock.advance(realDt); world.setTime(clock.hour);
    const wasTransitioning = tripod.transitioning;
    tripod.update(dt);
    if (wasTransitioning) {
      settings.tripod = tripod.deployed; syncTripod();
      if (!tripod.transitioning) tripodSettle = tripod.deployed ? 0.18 : 0;
    } else tripodSettle = Math.max(0, tripodSettle - dt);
    const aimStep = dt * Math.min(1, 35 / focalLength);
    if (!tripod.transitioning && keys.has('arrowleft')) yaw += aimStep; if (!tripod.transitioning && keys.has('arrowright')) yaw -= aimStep;
    if (!tripod.transitioning && keys.has('arrowup')) pitch = Math.min(1.3, pitch + aimStep * 0.7); if (!tripod.transitioning && keys.has('arrowdown')) pitch = Math.max(-1.3, pitch - aimStep * 0.7);
    if (!tripod.movementLocked && !capturing) {
      const forward = Number(keys.has('w')) - Number(keys.has('s')), side = Number(keys.has('d')) - Number(keys.has('a'));
      const length = Math.hypot(forward, side) || 1, speed = (keys.has('shift') ? 8 : 4.5) * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / length * speed;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / length * speed;
      if (world.canWalk(player.x + dx, player.z)) player.x += dx;
      if (world.canWalk(player.x, player.z + dz)) player.z += dz;
    }
    world.update(elapsed, settings);
  }
  updateCamera(); updateNPCPrompt(); world.scene.updateMatrixWorld(true);
  if (capturing && !modal.open && !meditation) captureFrame(now);
  if (shootReadyAt && now >= shootReadyAt) { shootReadyAt = 0; syncTripod(); }
  const p = subjectPosition(world, activeMission); const distance = p.distanceTo(player); p.project(camera);
  const marker = $('target-marker');
  marker.style.display = p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9 ? '' : 'none';
  marker.style.left = `${(p.x * 0.5 + 0.5) * 100}%`; marker.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
  $('target-label').textContent = `${Math.round(distance)} m`;
  applyCameraLight(settings);
  if (now - lastMeterTime > 150) {
    updateClockCue(); updateExposure(); renderer.shadowMap.needsUpdate = true; lastMeterTime = now;
  }
  renderer.render(world.scene, camera);
  if (!reducedMotion.matches && (tripod.transitioning || tripodSettle > 0)) {
    tripodView.update(tripod.progress, tripod.transitioning ? 1 : tripodSettle / 0.18, camera.aspect);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(tripodView.scene, tripodView.camera); renderer.autoClear = true;
  }
  if (!modal.open && now - lastClockSave > 60000) { persist(); lastClockSave = now; }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

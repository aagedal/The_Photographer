import * as THREE from 'three';
import { conversationTopics, dialoguePages, speakerObjectName, frameConversation } from './conversation.ts';
import { missions, type Category, type Mission } from './missions.ts';
import { assessPhoto, exposureStops, shutterLabel, type Assessment, type CameraSettings, type Framing } from './photography.ts';
import { createWorld, subjectPosition } from './world.ts';
import { defaultStudioRig, normalizeStudioRig, atStudio, lightNames, studioExposureOffset, flashCanFire, flashPower, flashRenderIntensity, subjectExposureStops, type StudioRig } from './lighting.ts';
import { adjustCameraSetting, shutterValues, apertureValues, isoValues, TripodState } from './controls.ts';
import { createTripodView } from './tripod.ts';
import { exposureSamples, cameraShake, handheldWobble } from './motion.ts';
import { createPhotoRenderer } from './photo-renderer.ts';
import { createViewfinderRenderer } from './depth-of-field.ts';
import { FocusState, focusDistanceAt, focusPosition, focusLabel, subjectInFocus } from './focus.ts';
import { filterCatalog, filterLabel, isFilterGear, gradientPosition, type FilterId } from './filters.ts';
import { DAY_SECONDS, WorldClock, sampleSky, formatTime, missionAmbientEV, missionReferenceHour, isMissionTime, wrapHour } from './environment.ts';
import { gearCatalog, money, normalizeCompleted, normalizeEconomy, ownsGear, equippedFilter, balance, earnedMoney, purchaseGear, completeMission, captureCount, focalRange, zoomFocal, fovForFocal, CaptureSequence, normalizeLens, type LensId, type Economy, type GearId } from './economy.ts';
import { WORLD_HALF, coastline, terrainHeight, trails } from './terrain.ts';
import { npcCatalog, nearestNPC, normalizeDiscovered, discoverNPC, canAcceptMission, missionGearReady, type NPC } from './exploration.ts';
import { WorldAudio } from './audio.ts';
import { localActivity, townRoad } from './life.ts';
import { ViewfinderState, createCameraView } from './camera-view.ts';
import { movementSpeed } from './wildlife.ts';
import { openingScenes, arrivalPosition, ARRIVAL_DURATION } from './opening.ts';
import { cameraStore, atCameraStore } from './camera-store.ts';
import { notebookMissions, type MissionSection } from './notebook.ts';
import { freshStory, normalizeStory, storyMissionUnlocked, storyDiscoveries, storyObjective, mainStoryIds, printPhoto, visitUncle, startExhibition, settleDays, buyCottage, PRINT_PRICE, EXHIBITION_DAILY, ROOM_RENT, COTTAGE_PRICE, publishReport, arthurMemories, rememberArthur, localStoryDialogue, horizonAlbum, horizonAlbumDialogue, meetWorkshop, shareWorkshop, workshopDialogue, workshopMissionIds, type Story } from './story.ts';
import { galleryPlace, unclePlace, paperPlace, boundaryPlace, nearStoryPlace } from './story-world.ts';
import { workshopPlace } from './harbor.ts';
import { contextInFrame } from './framing.ts';
import { normalizeSeries, nextShot, shotDone, shotMission, seriesCount, recordShot, seriesReady, assessShotView, type SeriesProgress } from './photo-series.ts';
import { regionalLandmarks, nearestLandmark } from './landmarks.ts';
import { TouchWalk } from './touch-controls.ts';
import { walkingRoute, clearWalk, routeDistance, relativeBearing, type WalkPoint } from './navigation.ts';
import './style.css';

const paths: Record<string, string> = {
  sneak: '<path d="m7 20 2-6 5 1 3 5M9 14l2-5 5 2 3-1M7 11l4-2"/><circle cx="13" cy="5" r="2"/>',
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
  sound: '<path d="M3 9h4l5-4v14l-5-4H3zM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
  focus: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="3"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.camera}</svg>`;
const categoryIcon: Record<Category, string> = { Nature: 'mountain', Sports: 'sports', News: 'book', Wedding: 'heart', Studio: 'studio', Astro: 'moon' };
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Photo { shotId?: string; payment?: number; burst?: { id: string; index: number; total: number }; id: string; missionId: string; image: string; settings: CameraSettings; result: Assessment; date: number; studio?: StudioRig; environment?: { hour: number; cloudCover: number } }
interface Save { destination?: string; series: SeriesProgress; activeShot?: string; story: Story; walkingIntroduction?: boolean; position?: [number, number]; openingSeen?: boolean; focus?: { mode: 'auto' | 'manual'; distance: number }; sound?: { enabled: boolean; volume: number }; discovered: string[]; lens?: LensId; version: 1; filterShopVersion: 1; filter?: FilterId; gradPosition?: number; completed: string[]; photos: Photo[]; active: string; hour?: number; focalLength?: number; economy: Economy; lighting?: { flashPower: number; studio: StudioRig } }
const playtest = new URLSearchParams(location.search).get('playtest');
const storageKey = playtest === null ? 'the-photographer-save-v1' : `the-photographer-playtest${playtest && playtest !== '1' ? `-${playtest.slice(0,32)}` : ''}-v1`;
let storageAvailable = true;
function loadSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (raw?.version === 1) {
      const completed = normalizeCompleted(raw.completed);
      const known = normalizeDiscovered(raw.discovered, [...completed, raw.active, ...(Array.isArray(raw.photos) ? raw.photos.map((p: Photo) => p?.missionId) : [])]);
      const story = normalizeStory(raw.story, completed, known);
      const discovered = storyDiscoveries(story, completed, known);
      return {
      version: 1, story, destination: typeof raw.destination === 'string' ? raw.destination : undefined,
      series: normalizeSeries(raw.series, Array.isArray(raw.photos) ? raw.photos : []),
      activeShot: typeof raw.activeShot === 'string' ? raw.activeShot : undefined,
      openingSeen: raw.openingSeen !== false,
      walkingIntroduction: !completed.includes('intro-deer') && (raw.walkingIntroduction === true || raw.active === 'intro-deer'),
      position: Array.isArray(raw.position) && raw.position.length === 2 && raw.position.every(Number.isFinite) ? raw.position : undefined,
      focus: new FocusState(raw.focus),
      sound: { enabled: raw.sound?.enabled !== false, volume: Number.isFinite(raw.sound?.volume) ? Math.max(0, Math.min(1, raw.sound.volume)) : 0.6 },
      filterShopVersion: 1, filter: raw.filter, gradPosition: gradientPosition(raw.gradPosition),
      completed,
      discovered,
      lens: raw.lens,
      economy: normalizeEconomy(raw.economy, completed, raw.lighting?.flashPower > 0 || (Array.isArray(raw.photos) && raw.photos.some((p: Photo) => (p?.settings?.flashPower ?? 0) > 0)), raw.filterShopVersion !== 1),
      focalLength: Number.isFinite(raw.focalLength) ? raw.focalLength : undefined,
      active: missions.some(m => m.id === raw.active) ? raw.active : missions[0].id,
      hour: Number.isFinite(raw.hour) ? wrapHour(raw.hour) : undefined,
      lighting: { flashPower: flashPower({ flashPower: raw.lighting?.flashPower } as CameraSettings), studio: normalizeStudioRig(raw.lighting?.studio) },
      photos: Array.isArray(raw.photos) ? raw.photos.filter((p: Photo) => missions.some(m => m.id === p.missionId) && typeof p.image === 'string' && /^data:image\/jpeg;base64,/.test(p.image) && p.image.length < 800000 && p.settings && p.result && Array.isArray(p.result.feedback)).slice(0, 16) : [],
    };
    }
  } catch { storageAvailable = false; }
  return { series: {}, story: freshStory(), openingSeen: false, version: 1, filterShopVersion: 1, discovered: ['intro-deer'], completed: [], photos: [], active: 'intro-deer', economy: normalizeEconomy(undefined, []) };
}
const save = loadSave();
const focus = new FocusState(save.focus);
const audio = new WorldAudio(save.sound?.enabled ?? true, save.sound?.volume ?? 0.6);
// These listeners execute within the browser’s user-gesture window.
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('keydown', () => audio.unlock());
let activeMission = missions.find(m => m.id === save.active && canAcceptMission(m, save.discovered, save.economy) && storyMissionUnlocked(m.id, save.story, save.completed)) ?? missions.find(m => save.discovered.includes(m.id) && missionGearReady(m, save.economy)) ?? missions.find(m => m.id === 'intro-deer')!;
function currentShot() { return activeMission.shots?.find(s => s.id === save.activeShot) ?? nextShot(activeMission, save.series, save.completed); }
function frameMission() { return shotMission(activeMission, currentShot()); }
save.activeShot = currentShot()?.id;
const clock = new WorldClock(save.hour ?? missionReferenceHour(activeMission));
let openingStep: number | null = null;
let openingSeconds = 0;
let meditation: { start: number; distance: number; elapsed: number; target: number; travelled: number } | null = null;
let lastClockSave = 0;
let equippedLens = normalizeLens(save.lens, save.economy);
let focalLength = THREE.MathUtils.clamp(save.focalLength ?? 35, ...focalRange(save.economy, equippedLens));
let settings: CameraSettings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: equippedFilter(save.filter, save.economy), gradPosition: gradientPosition(save.gradPosition), tripod: false, panning: false, flashPower: ownsGear(save.economy, 'flash') ? save.lighting?.flashPower ?? 0 : 0 };
let studioRig = normalizeStudioRig(save.lighting?.studio);
let lightingOpen = false;
let lightingMode: 'flash' | 'studio' = 'flash';
let cameraMode = false;
let sneaking = false;
const standingEyeHeight = 1.7, sneakingEyeHeight = 1.05;
let eyeHeight = standingEyeHeight;
const viewfinder = new ViewfinderState();
let lowQuality = false;
type PauseTab = 'assignments' | 'journal' | 'gallery' | 'explore' | 'settings';
let pauseTab: PauseTab = 'assignments';
let missionSection: MissionSection = 'active';
let capturing = false;
const captureSequence = new CaptureSequence();
let shotSettings: CameraSettings | null = null;
let shotPhotos: Photo[] = [];
let shotStoryAdvanced = false;
let shotId = '';
let shootReadyAt = 0;
let lastGearHint = -Infinity;
let toastTimer = 0;

const tripod = new TripodState();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let tripodSettle = 0;
let previewTimer = 0;
let conversationSpeaker: THREE.Object3D | undefined;
let conversationFrame = '';
type Destination = { id: string; name: string; point: WalkPoint; hint: string };
let destination: Destination | undefined;
let walkRoute: WalkPoint[] = [];
let lastRouteUpdate = 0;
const conversationCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
const options = (values: number[], label: (v: number) => string, selected: number) => values.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${label(v)}</option>`).join('');

$('app').innerHTML = `
  <main class="workspace">
    <section class="stage" id="stage" aria-label="Interactive 3D photography world">
      <nav class="hud-actions" aria-label="Game controls">
        <button class="hud-action help-button" id="help-button" aria-label="Open help menu" title="Controls & field guide">${icon('info')}</button>
        <button class="hud-action camera-toggle" id="camera-mode" aria-label="Toggle viewfinder (E)" aria-pressed="false" title="Raise / lower camera (E)">${icon('camera')}</button>
        <button class="menu-button" id="menu-button" aria-label="Open pause menu (Escape)" title="Assignments, journal, exploration and settings (Esc)"><span>Menu</span><kbd>Esc</kbd></button>
      </nav>
      <aside class="walking-guide" id="walking-guide" aria-label="Walking directions" hidden><span class="walking-arrow" id="walking-arrow" aria-hidden="true">↑</span><div><strong id="walking-name"></strong><span id="walking-distance"></span><small id="walking-turn"></small></div><button id="stop-directions" aria-label="Stop walking directions" title="Stop directions">${icon('close')}</button></aside>
      <button class="sneak-button" id="sneak" aria-label="Toggle sneaking (C)" aria-pressed="false" title="Sneak quietly (C)">${icon('sneak')}<span id="sneak-label">Sneak</span><kbd>C</kbd></button>
      <button class="walk-pad" id="walk-pad" aria-label="Walk: drag to move, release to stop" hidden><span class="walk-thumb" aria-hidden="true">${icon('compass')}</span></button>
      <aside id="lighting-panel" class="lighting-panel" aria-label="Lighting kit" hidden></aside>
      <div class="viewfinder" id="viewfinder"><span class="finder-meta"><span id="lens-label">35</span> MM · <span id="lens-type">PRIME</span> · 3:2</span><span class="focus-point" id="focus-point"></span><span class="finder-focus" id="focus-label"></span></div>
      <aside class="focus-control" id="focus-control" aria-label="Lens focus" hidden>
        <div class="focus-heading"><strong>Lens focus</strong><button id="focus-mode" title="Switch autofocus / manual focus (M)">AF · Autofocus</button></div>
        <label for="focus-distance">Focus distance <output id="focus-distance-value" aria-live="off"></output></label>
        <input id="focus-distance" type="range" min="0" max="100" step="0.1" aria-label="Manual focus distance"/>
        <div class="focus-scale"><span>0.7 m · [ nearer</span><span>] farther · ∞</span></div>
        <button id="focus-acquire">Focus once <kbd>Q</kbd></button>
        <p id="focus-status"></p>
      </aside>
      <label class="gradient-control" id="gradient-control" hidden>GND transition <output id="gradient-value">50%</output><input id="gradient-position" type="range" min="10" max="90" step="5" value="50" aria-label="Graduated ND transition height"/><small>Dark above · clear below</small></label>
      <section class="opening-overlay" id="opening-overlay" aria-label="Arrival in Willowbrook" hidden></section>
      <div class="meditation-overlay" id="meditation-overlay" hidden><div>${icon('moon')}<p>Meditating…</p><strong id="meditation-time"></strong><small>Esc to return</small></div></div>
      <button class="npc-prompt" id="npc-prompt" hidden></button>
      <div class="flash" id="flash"></div>
      <button id="capture-preview" class="capture-preview" aria-label="Review latest photograph" hidden></button>
      <button id="shot-guide" class="shot-guide" aria-label="Choose assignment view" hidden></button>
      <section class="camera-bar" aria-label="Manual camera settings">
        <div class="setting" title="Shutter: 1 slower / 2 faster"><label for="shutter">SHUTTER <small>1 / 2</small></label><select id="shutter">${options(shutterValues, shutterLabel, settings.shutter)}</select></div>
        <div class="setting" title="Aperture: 3 wider / 4 narrower"><label for="aperture">APERTURE <small>3 / 4</small></label><select id="aperture">${options(apertureValues, v => `f/${v}`, settings.aperture)}</select></div>
        <div class="setting" title="ISO: 5 lower / 6 higher"><label for="iso">ISO <small>5 / 6</small></label><select id="iso">${options(isoValues, String, settings.iso)}</select></div>
        <div class="setting lens-setting"><label for="lens">LENS</label><select id="lens" aria-label="Equipped lens"></select></div>
        <div class="setting filter-setting"><label for="filter">FILTER</label><select id="filter"><option value="none">—</option>${filterCatalog.map(filter => `<option value="${filter.id}">${filter.id === 'gnd3' ? 'GND8' : filter.label}</option>`).join('')}</select></div>
        <div class="equipment">
          <button id="focus-toggle" aria-label="Switch to manual focus (M)" aria-pressed="false" title="Manual focus (M)">${icon('focus')}</button>
          <button id="tripod" aria-label="Deploy tripod (T)" aria-pressed="false" title="Deploy tripod (T)">${icon('tripod')}</button>
          <button id="panning" aria-label="Toggle panning" aria-pressed="false" title="Panning">${icon('move')}</button>
          <button id="flash-toggle" aria-label="Toggle camera flash (F)" aria-pressed="false" title="Flash (F)">${icon('bolt')}</button>
          <button id="burst-mode" aria-label="Unlock burst camera in camera store" aria-pressed="false" title="Burst camera (B)">${icon('burst')}</button>
          <button id="lighting-kit" aria-label="Open lighting kit (L)" aria-expanded="false" title="Lighting kit (L)">${icon('studio')}</button>
        </div>
        <div class="exposure" title="Ambient exposure meter"><strong id="ev-label"></strong><div class="meter">${Array.from({ length: 11 }, () => '<i></i>').join('')}<span class="needle" id="meter-needle"></span></div></div>
        <button id="capture" class="shutter-button" aria-label="Take a photograph (Space)" title="Take a photograph (Space)"><span></span></button>
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
renderer.domElement.setAttribute('aria-label', 'Game world. WASD to walk, drag to look, Space to photograph.');
stage.prepend(renderer.domElement);
const world = createWorld();
const photoRenderer = createPhotoRenderer();
const viewfinderRenderer = createViewfinderRenderer();
const tripodView = createTripodView();
const cameraView = createCameraView();
const camera = new THREE.PerspectiveCamera(fovForFocal(focalLength, 1), 1, 0.1, 900);
camera.rotation.order = 'YXZ';
const spawn = save.position && world.canWalk(...save.position) ? save.position : activeMission.id === 'intro-deer' ? arrivalPosition : [activeMission.viewpoint[0], activeMission.viewpoint[2]] as const;
const player = new THREE.Vector3(spawn[0], world.groundHeight(...spawn) + eyeHeight, spawn[1]);
let yaw = 0, pitch = 0;
const keys = new Set<string>();
const touchWalk = new TouchWalk();
const touchLayout = matchMedia('(any-pointer: coarse), (max-width: 800px)');
const walkPad = $<HTMLButtonElement>('walk-pad');
let walkCenterX = 0, walkCenterY = 0, walkRadius = 40;
const targetVector = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const projected = new THREE.Vector3();
let elapsed = 0;
let focusDistance = focus.distance;
let drag = false;
let lookPointerId: number | null = null;
let lastPointerX = 0, lastPointerY = 0;

function startOpening() {
  modal.close(); keys.clear(); drag = false; setCameraMode(false);
  if (lightingOpen) toggleLightingKit();
  requestTripod(false, true); openingStep = 0; openingSeconds = 0;
  clock.skipTo(17); world.setTime(clock.hour); stage.classList.add('opening');
  $('opening-overlay').hidden = false; delete $('opening-overlay').dataset.beat; renderOpening();
}
function renderOpening() {
  $('opening-overlay').dataset.scene = String(openingStep);
  const beat = openingScenes[openingStep!];
  audio.speak(openingStep === 0 ? 'arthur' : 'ranger', beat.line);
  $('opening-overlay').innerHTML = `<button class="opening-skip" id="skip-opening">Skip introduction <kbd>Esc</kbd></button><div class="opening-caption"><span class="eyebrow">WILLOWBROOK · ${openingStep! + 1} / ${openingScenes.length}</span><h1 id="arrival-title">${beat.title}</h1><p class="opening-speaker" id="arrival-speaker">${beat.speaker}</p><p class="opening-line" id="arrival-line">“${beat.line}”</p><button class="primary" id="opening-next">${beat.action}${icon('arrow')}</button>${openingStep === 0 ? '<div class="arrival-progress" aria-hidden="true"><i id="arrival-progress"></i></div>' : ''}</div>`;
  $<HTMLButtonElement>('opening-next').disabled = openingStep === 0 && !reducedMotion.matches && openingSeconds < ARRIVAL_DURATION;
  $('skip-opening').onclick = () => finishOpening(true);
  $('opening-next').onclick = () => {
    if (openingStep === 0 && !reducedMotion.matches && openingSeconds < ARRIVAL_DURATION) return;
    if (openingStep === openingScenes.length - 1) finishOpening(false);
    else { openingStep!++; openingSeconds = 0; renderOpening(); }
  };
  $('opening-next').focus();
}
function finishOpening(_skipped: boolean) {
  audio.stopSpeaking();
  openingStep = null; world.opening.finish(); stage.classList.remove('opening'); $('opening-overlay').hidden = true;
  save.openingSeen = true; keys.clear(); drag = false;
  save.walkingIntroduction = true;
  const deer = missions.find(m => m.id === 'intro-deer')!;
  save.discovered = storyDiscoveries(save.story, save.completed, [...save.discovered, deer.id]); selectMission(deer);
  settings = { ...deer.recommended, flashPower: 0 }; focus.mode = 'auto'; equipLens('prime');
  player.set(arrivalPosition[0], world.groundHeight(...arrivalPosition) + eyeHeight, arrivalPosition[1]);
  yaw = 0; pitch = 0; viewfinder.request(false, true); syncSettings(); updateCamera();
  persist(); renderer.domElement.focus({ preventScroll: true });
}
function toast(message: string) {
  $('toast').textContent = message; $('toast').classList.add('show');
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('toast').classList.remove('show'), 3600);
}
function persist() {
  save.discovered = storyDiscoveries(save.story, save.completed, save.discovered);
  world.storyPlaces.setReportPublished(save.story.reportPublished, save.story.workshopShared);
  world.harbor.setShared(save.story.workshopShared);
  save.position = [player.x, player.z];
  save.destination = destination?.id;
  save.focus = { mode: focus.mode, distance: focus.distance };
  save.sound = { enabled: audio.enabled, volume: audio.volume };
  save.active = activeMission.id; save.hour = clock.hour; save.focalLength = focalLength; save.lens = equippedLens;
  save.filterShopVersion = 1; save.filter = settings.filter; save.gradPosition = gradientPosition(settings.gradPosition);
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
  if ($('menu-progress')) $('menu-progress').textContent = `${save.completed.length}/${missions.length} assignments · ${save.discovered.length} discovered · ${save.photos.length} photos · ${xp} XP · ${money(balance(save.economy, save.completed))} · Day ${save.story.day}`;
  if ($('save-status')) $('save-status').textContent = storageAvailable ? 'Saved on this device' : 'Saving unavailable · This session only';
  const shot = currentShot();
  $('shot-guide').hidden = !shot || save.completed.includes(activeMission.id) || openingStep !== null;
  if (shot) $('shot-guide').textContent = `${seriesCount(activeMission,save.series,save.completed)}/${activeMission.shots!.length} views · ${shot.title} · Esc to choose`;
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
  $<HTMLButtonElement>('capture').disabled = tripod.transitioning || capturing || viewfinder.transitioning || !!meditation || performance.now() < shootReadyAt;
  for (const id of ['shutter', 'aperture', 'iso', 'lens', 'filter', 'gradient-position', 'tripod', 'panning', 'flash-toggle', 'burst-mode', 'lighting-kit', 'focus-toggle', 'focus-mode', 'focus-acquire']) ($<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>(id)).disabled = capturing;
  $<HTMLInputElement>('focus-distance').disabled = capturing || focus.mode === 'auto';
}
function suggestSettings() {
  const brief = frameMission();
  if (activeMission.requiredGear && !missionGearReady(activeMission, save.economy)) { openGearShop(); return; }
  let suggested = { ...brief.recommended };
  if (activeMission.technique === 'water' && !ownsGear(save.economy, 'nd6')) {
    if (ownsGear(save.economy, 'nd5')) suggested = { ...suggested, filter: 'nd5', shutter: 0.5, aperture: 11 };
    else if (ownsGear(save.economy, 'nd4')) suggested = { ...suggested, filter: 'nd4', shutter: 0.25, aperture: 11 };
  }
  if (suggested.filter !== equippedFilter(suggested.filter, save.economy)) {
    openGearShop(); toast(`Buy ${filterLabel(suggested.filter)} for these suggested settings.`); return;
  }
  if (brief.recommended.focalLength) { equipLens('telephoto'); focalLength = brief.recommended.focalLength; updateLensProjection(); }
  else if (activeMission.shots) { equippedLens = 'prime'; focalLength = 35; updateLensProjection(); }
  settings = { ...suggested, gradPosition: gradientPosition(settings.gradPosition), flashPower: 0 };
  focus.mode = 'auto';
  requestTripod(settings.tripod);
  if (activeMission.category === 'Studio' && atStudio(player.x, player.y, player.z)) { studioRig = defaultStudioRig(); applyStudioRig(); }
  syncSettings(); if (lightingOpen) renderLightingPanel(); persist();
  modal.close(); toast('Suggested settings applied.');
}
function pauseNavigation() {
  const tabs: [PauseTab, string][] = [['assignments', 'Assignments'], ['journal', 'Journal'], ['gallery', 'Gallery'], ['explore', 'Explore'], ['settings', 'Settings']];
  return `<div class="pause-tabs" role="tablist" aria-label="Pause menu">${tabs.map(([id, label]) => `<button role="tab" id="tab-${id}" data-pause-tab="${id}" aria-selected="${pauseTab === id}" aria-controls="pause-panel" tabindex="${pauseTab === id ? 0 : -1}">${label}</button>`).join('')}</div>`;
}
function openPauseMenu(tab: PauseTab = pauseTab) {
  pauseTab = tab; persist();
  if (tab === 'journal') openJournal(true);
  else if (tab === 'gallery') openGallery(true);
  else if (tab === 'explore') openMap(true);
  else if (tab === 'settings') openSettings();
  else openBoard();
}
function activeMissionContent() {
  const m = activeMission;
  if (save.completed.includes(m.id)) return `<div class="empty"><span class="mission-badge complete">${icon('check')}Completed</span><h3>${esc(m.title)}</h3><p>This assignment is finished. Choose an available story for your next photograph${m.shots ? ', or revisit either view without another payment' : ''}.</p>${seriesChecklist(m,true)}<div class="pause-actions"><button class="secondary" id="walk-assignment">${icon('compass')}Walk to the viewpoint</button><button class="secondary" id="travel">Find the spot</button><button class="secondary" id="suggest">Suggested settings</button></div><button class="secondary" id="choose-available">Browse available assignments</button></div>`;
  return `<article class="pause-assignment"><span class="mission-badge">Active assignment</span><span class="eyebrow">${m.category} · ${esc(m.location)} · ${m.payment ? `${money(m.payment)} payment` : m.id === 'nature-bear' ? 'A gift for Arthur' : 'First photograph'}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>
    ${m.timeWindow ? `<p class="mission-time ${isMissionTime(m, clock.hour) ? 'ready' : 'waiting'}">${esc(m.timeWindow.label)} · ${isMissionTime(m, clock.hour) ? 'Ready now' : 'Wait for the light'}</p>` : ''}
    ${seriesChecklist(m, true)}
    <details><summary>Field notes</summary><p>${esc(frameMission().lesson)}</p></details>
    <div class="pause-actions"><button class="secondary" id="walk-assignment">${icon('compass')}Walk to the viewpoint</button><button class="secondary" id="travel">${icon('pin')}${save.walkingIntroduction ? 'Show the trail on the map' : 'Find the spot'}</button><button class="secondary" id="suggest">Suggested settings</button></div></article>`;
}
function seriesChecklist(m: Mission, selectable = false) {
  if (!m.shots) return '';
  return `<section class="shot-checklist" aria-label="Required photographs"><p><strong>${seriesCount(m,save.series,save.completed)}/${m.shots.length} views accepted</strong> · Each view must pass. The full set earns the commission.</p>${m.shots.map((shot,index) => {
    const done=shotDone(m,shot,save.series,save.completed), selected=m.id===activeMission.id && currentShot()?.id===shot.id;
    const contents=`<span class="shot-number">${done ? '✓' : index+1}</span><span><strong>${esc(shot.title)}</strong><small>${esc(shot.description)}</small></span><span class="shot-status">${done ? 'Accepted' : selected ? 'Shooting' : 'Needed'}</span>`;
    return selectable ? `<button class="shot-brief" data-shot="${shot.id}" aria-pressed="${selected}">${contents}</button>` : `<div class="shot-brief">${contents}</div>`;
  }).join('')}</section>`;
}
function chooseShot(id: string) {
  if (capturing || !activeMission.shots?.some(s=>s.id===id)) return;
  if (destination?.id.startsWith('mission:')) clearDirections();
  save.activeShot=id; requestTripod(false,true); applyStudioRig(); updateExposure(); persist();
}
function openSettings() {
  pauseTab = 'settings';
  showModal('Make yourself at home.', 'PAUSED · SETTINGS', 'Sound, display, controls, and your saved notebook.', `<div class="settings-stack">
    <section class="settings-card"><div><h3>Sound</h3><p>Character voices, wind, water, birds, and quiet streets.</p></div><button class="secondary" id="sound-toggle" aria-pressed="${audio.enabled}" ${audio.available ? '' : 'disabled'}>${audio.enabled ? 'Mute' : 'Enable sound'}</button><label class="volume-setting" for="sound-volume">Volume <output id="sound-value">${Math.round(audio.volume * 100)}%</output><input id="sound-volume" type="range" min="0" max="100" value="${Math.round(audio.volume * 100)}" ${audio.available ? '' : 'disabled'}/></label></section>
    <section class="settings-card"><div><h3>Graphics</h3><p>Performance reduces shadows and rendering resolution.</p></div><button class="secondary" id="quality">${lowQuality ? 'Performance' : 'Balanced'}</button></section>
    <section class="settings-card"><div><h3>Controls</h3><p>Movement, camera shortcuts, and photography basics.</p></div><button class="secondary" id="menu-help">View controls</button></section>
    <section class="settings-card"><div><h3>Notebook</h3><p>Restart with a backup, or restore your previous progress.</p></div><button class="secondary" id="new-notebook">Manage notebook</button></section>
  </div>`, 'menu');
  $('quality').onclick = () => { toggleQuality(); openSettings(); };
  $('menu-help').onclick = openHelp; $('new-notebook').onclick = openNewNotebook;
  $('sound-toggle').onclick = () => { audio.enabled = !audio.enabled; if (audio.enabled) audio.unlock(); else audio.silence(); persist(); openSettings(); };
  $<HTMLInputElement>('sound-volume').oninput = e => { audio.volume = Number((e.target as HTMLInputElement).value) / 100; $('sound-value').textContent = `${Math.round(audio.volume * 100)}%`; persist(); };
}
function openGearShop() {
  if (!atCameraStore(player.x, player.y, player.z)) {
    showModal(cameraStore.name, 'CAMERA STORE · TOWN CENTRE', 'New equipment is sold at the storefront, just south of the running track.', `<div class="store-directions">${icon('shop')}<h3>A new reason to visit town.</h3><p>Visit the green-striped camera store and press <kbd>R</kbd> at the door to browse lenses, filters, flash, and cameras. Switch gear you already own from the camera bar.</p><button class="primary" id="locate-store">Find the camera store on the map ${icon('map')}</button></div>`);
    $('locate-store').onclick = () => openPauseMenu('explore'); return;
  }
  const cash = balance(save.economy, save.completed);
  showModal(cameraStore.name, 'CAMERA STORE', 'Each assignment pays once. Spend your earnings on new ways to shoot.', `
    <div class="shop-wallet"><div><small>AVAILABLE</small><strong id="shop-balance">${money(cash)}</strong></div><span>${money(earnedMoney(save.completed))} in commissions · ${money(save.economy.living?.exhibitionIncome ?? 0)} from exhibitions</span></div>
    <div class="gear-grid">${gearCatalog.map(gear => {
      const owned = ownsGear(save.economy, gear.id), affordable = cash >= gear.price;
      return `<article class="gear-card" id="gear-${gear.id}"><div class="gear-icon">${icon(gear.icon)}</div><div><h3>${gear.name}</h3><p>${gear.description}</p><div class="gear-action">${owned ? `<span class="gear-owned">${icon('check')}${save.economy.gifted.includes(gear.id) ? 'Kept from your previous kit' : 'In your kit'}</span>${gear.id === 'burst' ? `<button class="secondary" id="shop-burst">${save.economy.burstEnabled ? 'Use single shots' : 'Use burst mode'}</button>` : isFilterGear(gear.id) ? `<button class="secondary" data-fit-filter="${settings.filter === gear.id ? 'none' : gear.id}">${settings.filter === gear.id ? 'Remove filter' : 'Fit filter'}</button>` : ''}` : `<strong>${money(gear.price)}</strong><button class="${affordable ? 'primary' : 'secondary'}" data-buy="${gear.id}" ${affordable ? '' : 'disabled'}>${affordable ? `Buy · ${money(gear.price)}` : `Need ${money(gear.price - cash)} more`}</button>`}</div></div></article>`;
    }).join('')}</div><p class="starter-kit">Included: 35 mm lens, tripod, and studio lights. Filters are separate purchases; one filter can be fitted at a time. Start with the lighthouse or a filter-free brief to earn your first upgrade. Existing notebooks keep their previous ND64 and CPL.</p>`);
  modal.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(button => button.onclick = () => {
    const id = button.dataset.buy as GearId, purchase = purchaseGear(save.economy, save.completed, id);
    if (!purchase.ok) { toast(purchase.reason === 'funds' ? `Earn ${money(purchase.shortfall)} more.` : 'That gear is already in your kit.'); return; }
    save.economy = purchase.economy; if (id === 'zoom' || id === 'telephoto') equipLens(id); if (isFilterGear(id)) settings.filter = id;
    syncSettings(); updateLensLabel(); if (id === 'gnd3') setCameraMode(true); if (lightingOpen) renderLightingPanel(); persist(); openGearShop();
    toast(`${gearCatalog.find(g => g.id === id)!.name} added to your kit.`);
  });
  modal.querySelectorAll<HTMLButtonElement>('[data-fit-filter]').forEach(button => button.onclick = () => { fitFilter(button.dataset.fitFilter as FilterId); openGearShop(); });
  if ($('shop-burst')) $('shop-burst').onclick = () => { toggleBurst(); openGearShop(); };
}
function fitFilter(filter: FilterId) {
  if (isFilterGear(filter) && !ownsGear(save.economy, filter)) {
    syncSettings(); openGearShop(); $(`gear-${filter}`)?.scrollIntoView({ block: 'center' });
    toast(`Buy ${filterLabel(filter)} before fitting it.`); return;
  }
  settings.filter = filter; syncSettings(); if (filter === 'gnd3') setCameraMode(true); persist();
}
function toggleBurst() {
  if (!ownsGear(save.economy, 'burst')) { openGearShop(); return; }
  save.economy.burstEnabled = !save.economy.burstEnabled; syncSettings(); persist();
}
function gearHint(message: string) {
  if (performance.now() - lastGearHint < 2500) return;
  lastGearHint = performance.now(); toast(message);
}
function toggleSneak() {
  if (capturing || meditation || modal.open || openingStep !== null) return;
  sneaking = !sneaking;
  $('sneak').setAttribute('aria-pressed', String(sneaking));
  $('sneak-label').textContent = sneaking ? 'Sneaking' : 'Sneak';
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
  if (reducedMotion.matches) { advanceWorldTime(wrapHour(target - clock.hour)); finishMeditation(); return; }
  meditation = { start: clock.hour, distance: wrapHour(target - clock.hour), elapsed: 0, target, travelled: 0 };
  $('meditation-overlay').hidden = false; syncTripod();
}
function finishMeditation() {
  meditation = null; $('meditation-overlay').hidden = true;
  world.setTime(clock.hour); world.update(elapsed, settings); renderer.shadowMap.needsUpdate = true;
  updateExposure(); syncTripod(); persist();
}
function leaveModal() { modal.close(); }
function toggleQuality() {
  lowQuality = !lowQuality;
  renderer.setPixelRatio(lowQuality ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !lowQuality; renderer.shadowMap.needsUpdate = true; resize();
}
function faceSubject(m: Mission) {
  if (m.id === activeMission.id) m = frameMission();
  const p = subjectPosition(world, m);
  const d = p.clone().sub(player);
  yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  updateCamera();
}
function travelTo(m: Mission) {
  if (save.walkingIntroduction) { toast('Explore on foot. Travel shortcuts unlock after your first deer photograph.'); return; }
  if (!canAcceptMission(m, save.discovered, save.economy)) return;
  if (m.id === activeMission.id) m = frameMission();
  player.set(m.viewpoint[0], world.groundHeight(m.viewpoint[0], m.viewpoint[2]) + eyeHeight, m.viewpoint[2]); requestTripod(false, true);
  // Travel preserves manual exposure choices but packs the tripod away.
  syncSettings(); faceSubject(m); renderer.shadowMap.needsUpdate = true;
  if (destination) walkRoute = walkingRoute([player.x, player.z], destination.point, world.canWalk);
  toast(m.location);
}
function selectMission(m: Mission) {
  if (!save.discovered.includes(m.id) || !storyMissionUnlocked(m.id, save.story, save.completed)) { toast('Continue Arthur’s story or talk to the locals to discover this assignment.'); return false; }
  if (!missionGearReady(m, save.economy)) { openGearShop(); return false; }
  if (destination?.id.startsWith('mission:')) clearDirections();
  activeMission = m; save.activeShot = nextShot(m,save.series,save.completed)?.id; missionSection = 'active'; renderer.shadowMap.needsUpdate = true;
  lightingMode = atStudio(player.x, player.y, player.z) && m.category === 'Studio' ? 'studio' : 'flash';
  applyStudioRig(); setCameraMode(false); updateExposure(); persist(); if (lightingOpen) renderLightingPanel();
  return true;
}
function syncSettings() {
  settings.filter = equippedFilter(settings.filter, save.economy);
  $<HTMLSelectElement>('filter').innerHTML = `<option value="none">—</option>${filterCatalog.filter(filter => ownsGear(save.economy, filter.id)).map(filter => `<option value="${filter.id}">${filter.id === 'gnd3' ? 'GND8' : filter.label}</option>`).join('')}`;
  updateLensLabel();
  $('gradient-control').hidden = !cameraMode || settings.filter !== 'gnd3';
  $<HTMLInputElement>('gradient-position').value = String(Math.round(gradientPosition(settings.gradPosition) * 100));
  $('gradient-value').textContent = `${Math.round(gradientPosition(settings.gradPosition) * 100)}%`;
  if (!ownsGear(save.economy, 'flash')) settings.flashPower = 0;
  for (const key of ['shutter', 'aperture', 'iso', 'filter'] as const) $<HTMLSelectElement>(key).value = String(settings[key]);
  for (const key of ['panning'] as const) { $(key).classList.toggle('on', settings[key]); $(key).setAttribute('aria-pressed', String(settings[key])); }
  $('flash-toggle').classList.toggle('on', flashPower(settings) > 0); $('flash-toggle').setAttribute('aria-pressed', String(flashPower(settings) > 0));
  const flashOwned = ownsGear(save.economy, 'flash'), burstOwned = ownsGear(save.economy, 'burst');
  $('flash-toggle').classList.toggle('gear-locked', !flashOwned);
  $('flash-toggle').setAttribute('aria-label', flashOwned ? 'Toggle camera flash (F)' : 'Unlock flash in camera store ($180)');
  $('flash-toggle').title = flashOwned ? 'Flash (F)' : 'Flash · $180 in camera store';
  $('burst-mode').classList.toggle('gear-locked', !burstOwned);
  $('burst-mode').classList.toggle('on', save.economy.burstEnabled);
  $('burst-mode').setAttribute('aria-pressed', String(save.economy.burstEnabled));
  $('burst-mode').setAttribute('aria-label', burstOwned ? 'Toggle three-frame burst (B)' : 'Unlock burst camera in camera store ($360)');
  $('burst-mode').title = burstOwned ? `Shooting: ${save.economy.burstEnabled ? '3-frame burst' : 'single'} (B)` : 'Burst camera · $360 in camera store';
  renderer.shadowMap.needsUpdate = true;
  syncTripod(); syncFocusControls(); updateExposure();
}
function sceneEV() {
  return missionAmbientEV(activeMission, clock.hour) + (activeMission.category === 'Studio' ? studioExposureOffset(studioRig, subjectPosition(world, frameMission()).y) : 0);
}
function updateExposure() {
  const stops = exposureStops(settings, sceneEV());
  $('ev-label').textContent = `${stops > 0 ? '+' : ''}${stops.toFixed(1)} EV`;
  $('meter-needle').style.left = `${50 + THREE.MathUtils.clamp(stops, -3, 3) / 3 * 48}%`;
  $('meter-needle').style.background = Math.abs(stops) > 1.6 ? 'var(--accent)' : 'var(--success)';
  renderer.domElement.style.filter = '';
  updateLightingReadout();
}
function setCameraMode(value: boolean) {
  cameraMode = value; viewfinder.request(value, reducedMotion.matches); updateLensProjection(); syncTripod(); stage.classList.toggle('camera-mode', value); syncTouchWalking();
  $('focus-control').hidden = !value || focus.mode !== 'manual';
  $('gradient-control').hidden = !value || settings.filter !== 'gnd3';
  $('camera-mode').classList.toggle('selected', value); $('camera-mode').setAttribute('aria-pressed', String(value)); updateExposure();
  if (value) updateFocus();
}
function updateCamera() {
  player.y = world.groundHeight(player.x, player.z) + eyeHeight;
  camera.position.copy(player);
  const dip = !reducedMotion.matches && tripod.transitioning ? Math.sin(tripod.progress * Math.PI) : 0;
  const wobble = handheldWobble(elapsed, focalLength, tripod.progress, reducedMotion.matches);
  camera.position.y -= dip * 0.07;
  camera.rotation.set(pitch - dip * 0.025 + wobble.pitch, yaw + wobble.yaw, 0); camera.updateMatrixWorld();
}
function applyStudioRig() {
  const target = activeMission.category === 'Studio' ? subjectPosition(world, frameMission()) : new THREE.Vector3(28, 1.35, -26);
  world.setStudioRig(studioRig, [target.x, target.y, target.z], activeMission.category === 'Studio');
  renderer.shadowMap.needsUpdate = true;
}
function applyCameraLight(s: CameraSettings, takingPhoto = false) {
  const preview = takingPhoto || cameraMode || lightingOpen;
  // Apply ambient exposure in linear renderer space. Divide the brief pulse by this gain
  // so changing shutter duration cannot change flash exposure within the sync range.
  const timeOffset = missionAmbientEV(activeMission, clock.hour) - activeMission.ev;
  const renderedLightRatio = activeMission.category === 'Studio' ? 1 : sampleSky(clock.hour).lightLevel / sampleSky(missionReferenceHour(activeMission)).lightLevel;
  // Graduated attenuation is spatial and is applied by the lens shader.
  const uniformSettings = s.filter === 'gnd3' ? { ...s, filter: 'none' as const } : s;
  const stops = exposureStops(uniformSettings, activeMission.ev) + timeOffset - Math.log2(renderedLightRatio);
  const gain = preview ? THREE.MathUtils.clamp(2 ** stops, takingPhoto ? 0.000001 : 0.025, takingPhoto ? 32 : 8) : 1;
  renderer.toneMappingExposure = 1.05 * gain;
  const direction = camera.getWorldDirection(new THREE.Vector3());
  world.setFlash([player.x, player.y, player.z], [direction.x, direction.y, direction.z], preview ? flashRenderIntensity(s) / gain : 0);
}

function toggleLightingKit() {
  lightingOpen = !lightingOpen;
  $('lighting-panel').hidden = !lightingOpen; stage.classList.toggle('lighting-open', lightingOpen);
  $('lighting-kit').classList.toggle('selected', lightingOpen); $('lighting-kit').setAttribute('aria-expanded', String(lightingOpen));
  if (lightingOpen) { lightingMode = atStudio(player.x, player.y, player.z) ? 'studio' : 'flash'; renderLightingPanel(); }
  renderer.shadowMap.needsUpdate = true;
}
function renderLightingPanel() {
  const power = flashPower(settings), flashOwned = ownsGear(save.economy, 'flash');
  const studioNearby = atStudio(player.x, player.y, player.z);
  if (!studioNearby) lightingMode = 'flash';
  $('lighting-panel').dataset.studioAvailable = String(studioNearby);
  $('lighting-panel').innerHTML = `<div class="lighting-heading"><div><div class="eyebrow">YOUR LIGHTING KIT</div><h2>Shape the light.</h2></div><button class="close" id="close-lighting" aria-label="Close lighting kit">${icon('close')}</button></div>
    <div class="lighting-mode-tabs"><button data-light-mode="flash" class="${lightingMode === 'flash' ? 'selected' : ''}">${icon('bolt')}Camera flash</button>${studioNearby ? `<button data-light-mode="studio" class="${lightingMode === 'studio' ? 'selected' : ''}">${icon('studio')}Studio lights</button>` : ''}</div>
    <div class="lighting-readings"><span>Ambient<strong id="lighting-ambient">—</strong></span><span>Subject<strong id="lighting-subject">—</strong></span></div>
    <div class="lighting-section" ${lightingMode === 'studio' ? 'hidden' : ''}><label class="light-select-label" for="flash-power">Manual flash power</label><select id="flash-power" ${flashOwned ? '' : 'disabled'}>${[0, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map(v => `<option value="${v}" ${v === power ? 'selected' : ''}>${v === 0 ? 'Off' : v === 1 ? 'Full power' : `1/${Math.round(1 / v)} power`}</option>`).join('')}</select>
      ${flashOwned ? '' : '<button class="secondary" id="unlock-flash">Unlock flash in camera store · $180</button>'}<p class="lighting-note">A brief pulse lights nearby subjects most. Double the distance and only a quarter of the flash light reaches them. Preview shows the pulse as a steady light.</p>
      <p class="lighting-note" id="flash-sync-note"></p>
    </div>
    ${studioNearby ? `<div class="lighting-section" ${lightingMode === 'flash' ? 'hidden' : ''}><p class="lighting-note">Continuous lights: shutter, aperture, and ISO all affect their exposure. Move a light closer to make its falloff stronger.</p>
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
    </div>` : ''}<p class="lighting-note">GN 24 at ISO 100 · sync limit 1/250 s · no high-speed sync. The subject meter is approximate; the scene renders light angles and shadows.</p>`;
  $('close-lighting').onclick = toggleLightingKit;
  for (const id of ['unlock-flash', 'studio-unlock-flash']) if ($(id)) $(id).onclick = openGearShop;
  $('lighting-panel').querySelectorAll<HTMLButtonElement>('[data-light-mode]').forEach(button => button.onclick = () => {
    if (button.dataset.lightMode === 'studio' && !studioControlsAvailable()) return;
    lightingMode = button.dataset.lightMode as typeof lightingMode; renderLightingPanel();
  });
  if ($('flash-practice')) $('flash-practice').onclick = () => {
    if (!studioControlsAvailable()) return;
    if (!ownsGear(save.economy, 'flash')) { openGearShop(); return; }
    if (!selectMission(missions.find(m => m.id === 'studio-1')!)) return;
    for (const name of lightNames) studioRig[name].enabled = false;
    const target = subjectPosition(world, frameMission()); player.set(target.x, 1.7, target.z + 3.5);
    settings = { shutter: 1 / 250, aperture: 4, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0.25 };
    requestTripod(false, true); applyStudioRig(); faceSubject(activeMission); setCameraMode(true); syncSettings(); persist(); lightingMode = 'flash'; renderLightingPanel();
    toast('Close subject, 1/4 flash, darker room. Change shutter speed and compare the ambient reading.');
  };
  $<HTMLSelectElement>('flash-power').onchange = e => { settings.flashPower = ownsGear(save.economy, 'flash') ? Number((e.target as HTMLSelectElement).value) : 0; syncSettings(); renderer.shadowMap.needsUpdate = true; persist(); };
  $('lighting-panel').querySelectorAll<HTMLInputElement>('[data-light-name]').forEach(input => input.onchange = () => {
    if (!studioControlsAvailable()) return;
    studioRig[input.dataset.lightName as keyof StudioRig].enabled = input.checked; applyStudioRig(); updateExposure(); persist();
  });
  $('lighting-panel').querySelectorAll<HTMLInputElement>('[data-property]').forEach(input => {
    input.oninput = () => {
      if (!studioControlsAvailable()) return;
      const name = input.dataset.light as keyof StudioRig, key = input.dataset.property as 'power' | 'angle' | 'distance' | 'height';
      const value = Number(input.value); studioRig[name][key] = value;
      $(`${name}-${key}-value`).textContent = key === 'power' ? `${Math.round(value * 100)}%` : key === 'angle' ? `${value}°` : `${value.toFixed(1)} m`;
      applyStudioRig(); updateExposure();
    };
    input.onchange = persist;
  });
  $('lighting-panel').querySelectorAll<HTMLSelectElement>('[data-light-colour]').forEach(select => select.onchange = () => {
    if (!studioControlsAvailable()) return;
    studioRig[select.dataset.lightColour as keyof StudioRig].colour = select.value as StudioRig['key']['colour']; applyStudioRig(); persist();
  });
  $('lighting-panel').querySelectorAll<HTMLButtonElement>('[data-light-preset]').forEach(button => button.onclick = () => {
    if (!studioControlsAvailable()) return;
    studioRig = defaultStudioRig();
    if (button.dataset.lightPreset === 'dramatic') { studioRig.fill.power = 0.05; studioRig.key.angle = -70; studioRig.rim.power = 0.25; }
    if (button.dataset.lightPreset === 'rim') { studioRig.key.power = 0.1; studioRig.fill.power = 0; studioRig.rim.power = 1.5; }
    if (button.dataset.lightPreset === 'off') for (const name of lightNames) studioRig[name].enabled = false;
    applyStudioRig(); updateExposure(); persist(); renderLightingPanel();
  });
  updateLightingReadout();
}
function studioControlsAvailable() {
  if (atStudio(player.x, player.y, player.z)) return true;
  if (lightingOpen) renderLightingPanel();
  return false;
}
function syncLightingAvailability() {
  if (lightingOpen && $('lighting-panel').dataset.studioAvailable !== String(atStudio(player.x, player.y, player.z))) renderLightingPanel();
}
function updateLightingReadout() {
  if (!lightingOpen || !$('lighting-subject')) return;
  const distance = subjectPosition(world, frameMission()).distanceTo(player);
  const ambient = exposureStops(settings, sceneEV());
  const subject = subjectExposureStops(settings, sceneEV(), distance, activeMission.category !== 'Astro', subjectImageY());
  const format = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} EV`;
  $('lighting-ambient').textContent = format(ambient); $('lighting-subject').textContent = format(subject);
  $('flash-sync-note').textContent = flashPower(settings) === 0 ? 'Flash off.' : !flashCanFire(settings) ? 'Above 1/250 s sync: flash will not fire. Choose 1/250 s or a slower shutter.' : activeMission.category === 'Astro' ? 'The stars are too distant for your flash. It can still light a nearby foreground.' : `${activeMission.subject} · ${distance.toFixed(1)} m. Try a faster shutter to darken the background while keeping flash exposure steady.`;
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width / height; camera.fov = viewfinder.fov(focalLength, camera.aspect); camera.updateProjectionMatrix();
  // The frame and saved photo share a centered 3:2 crop.
  $('viewfinder').style.width = `${Math.min(width, height * 1.5)}px`;
  updateLensLabel();
}
new ResizeObserver(resize).observe(stage);

function getFraming(): Framing {
  targetVector.copy(subjectPosition(world, frameMission()));
  const direction = targetVector.clone().sub(camera.position);
  const distance = direction.length();
  const lensCamera = camera.clone(); lensCamera.fov = fovForFocal(focalLength, camera.aspect); lensCamera.updateProjectionMatrix();
  projected.copy(targetVector).project(lensCamera);
  const cropX = Math.min(1, 1.5 / camera.aspect), cropY = Math.min(1, camera.aspect / 1.5);
  const nx = projected.x / cropX, ny = projected.y / cropY;
  const visible = projected.z > -1 && projected.z < 1 && Math.abs(nx) < 0.96 && Math.abs(ny) < 0.96;
  raycaster.set(camera.position, direction.normalize()); raycaster.far = Math.max(0, distance - 0.7);
  const occluded = activeMission.category !== 'Astro' && raycaster.intersectObjects(world.solids, false).length > 0;
  const subjectDepth = -targetVector.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const contextVisible = contextInFrame(world.subjects, world.solids, frameMission(), camera, focalLength);
  return { visible, distance, centerOffset: Math.max(Math.abs(nx), Math.abs(ny)), occluded, subjectDepth, contextVisible, wildlifeSpooked: activeMission.id === 'intro-deer' && world.deerMood(elapsed) !== 'calm' };
}
function subjectImageY(): number {
  const lensCamera = camera.clone(); lensCamera.fov = fovForFocal(focalLength, camera.aspect); lensCamera.updateProjectionMatrix();
  const p = subjectPosition(world, frameMission()).project(lensCamera);
  return THREE.MathUtils.clamp(0.5 - p.y / Math.min(1, camera.aspect / 1.5) * 0.5, 0, 1);
}

function autofocus(frame: Framing): number {
  if (frame.visible && !frame.occluded) {
    // Focus on the subject's plane, not its radial distance from the camera.
    if (activeMission.category === 'Astro') return 1e6;
    return Math.max(0.2, -subjectPosition(world, frameMission()).applyMatrix4(camera.matrixWorldInverse).z);
  }
  // Looking away from the assignment focuses on the surface at the reticle.
  raycaster.setFromCamera(new THREE.Vector2(), camera); raycaster.far = camera.far;
  const hit = raycaster.intersectObjects(world.scene.children, true).find(hit => {
    if (!(hit.object instanceof THREE.Mesh)) return false;
    for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) if (!object.visible) return false;
    const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
    return materials.some(material => material.depthWrite && material.opacity >= 0.9);
  });
  return hit ? Math.max(0.2, -hit.point.clone().applyMatrix4(camera.matrixWorldInverse).z) : 1e6;
}

function syncFocusControls() {
  const manual = focus.mode === 'manual';
  $('focus-control').hidden = !cameraMode || !manual;
  $('focus-toggle').classList.toggle('on', manual);
  $('focus-toggle').setAttribute('aria-pressed', String(manual));
  $('focus-toggle').setAttribute('aria-label', `${manual ? 'Return to autofocus' : 'Switch to manual focus'} (M)`);
  $('focus-toggle').title = `${manual ? 'Autofocus' : 'Manual focus'} (M)`;
  $('focus-mode').textContent = manual ? 'MF · Manual' : 'AF · Autofocus';
  $('focus-mode').setAttribute('aria-pressed', String(manual));
  $<HTMLInputElement>('focus-distance').disabled = !manual || capturing;
  $<HTMLInputElement>('focus-distance').value = String(focusPosition(focus.distance));
  $('focus-distance-value').textContent = focusLabel(focus.distance);
  $('focus-distance').setAttribute('aria-valuetext', focusLabel(focus.distance));
}
function toggleFocus() {
  if (capturing || meditation || modal.open) return;
  updateCamera(); world.scene.updateMatrixWorld(true);
  focus.toggle(autofocus(getFraming()));
  setCameraMode(true); updateFocus(); persist();
}
function acquireFocus() {
  if (capturing || meditation || modal.open) return;
  updateCamera(); world.scene.updateMatrixWorld(true);
  focus.acquire(autofocus(getFraming()));
  setCameraMode(true); updateFocus(); persist();
}
function adjustFocus(steps: number) {
  if (focus.mode === 'auto') acquireFocus();
  focus.adjust(steps); setCameraMode(true); updateFocus(); persist();
}
function updateFocus() {
  const frame = getFraming();
  if (focus.mode === 'auto') focus.acquire(autofocus(frame));
  focusDistance = focus.distance;
  const subjectVisible = frame.visible && !frame.occluded;
  const sharp = subjectInFocus(activeMission.category === 'Astro' ? 450 : frame.subjectDepth!, focalLength, settings.aperture, focusDistance);
  $('focus-point').classList.toggle('defocused', subjectVisible && !sharp);
  const status = subjectVisible ? sharp ? 'In focus' : 'Out of focus' : focus.mode === 'manual' ? 'Focus locked' : 'Center surface';
  $('focus-label').textContent = `${focus.mode === 'manual' ? 'MF' : 'AF'} · ${focusLabel(focusDistance)}`;
  $('focus-status').textContent = status;
  $('focus-status').classList.toggle('defocused', subjectVisible && !sharp);
  syncFocusControls();
}

function makePhoto(s: CameraSettings, frame: Framing): string {
  const samples = exposureSamples(s.shutter);
  const photoCamera = camera.clone();
  photoCamera.aspect = 1.5; photoCamera.fov = fovForFocal(s.focalLength ?? focalLength, 1.5); photoCamera.updateProjectionMatrix();
  const originalRotation = photoCamera.quaternion.clone();
  const pan = s.panning && activeMission.subject === 'Runner';
  const trackingCamera = photoCamera.clone();
  trackingCamera.lookAt(subjectPosition(world, frameMission()));
  const trackingOffset = trackingCamera.quaternion.clone().invert().multiply(originalRotation);
  let base: HTMLCanvasElement;
  try {
    base = photoRenderer.render(renderer, samples.length, photoCamera, { aperture: s.aperture, focalLength: s.focalLength ?? focalLength, focusDistance: s.focusDistance ?? autofocus(frame), filter: s.filter, gradPosition: s.gradPosition }, i => {
      const offset = samples[i];
      world.update(elapsed + offset, s, clock.hour + offset * 24 / DAY_SECONDS);
      // Sky motion uses exposure seconds rather than the accelerated game clock.
      world.setTime(clock.hour + offset / 3600);
      world.scene.updateMatrixWorld(true);
      photoCamera.quaternion.copy(originalRotation);
      if (pan) {
        trackingCamera.lookAt(subjectPosition(world, frameMission()));
        photoCamera.quaternion.copy(trackingCamera.quaternion).multiply(trackingOffset);
      }
      const shake = cameraShake(s, offset, elapsed);
      photoCamera.rotateY(shake.yaw); photoCamera.rotateX(shake.pitch); photoCamera.updateMatrixWorld();
      applyCameraLight(s, true);
      // A single brief pulse freezes the middle sample; its energy remains
      // constant when averaging more ambient samples over a longer shutter.
      const direction = photoCamera.getWorldDirection(new THREE.Vector3());
      const pulse = i === Math.floor(samples.length / 2) ? samples.length : 0;
      world.setFlash([player.x, player.y, player.z], [direction.x, direction.y, direction.z], flashRenderIntensity(s) * pulse / (renderer.toneMappingExposure / 1.05));
      renderer.shadowMap.needsUpdate = true;
      renderer.render(world.scene, photoCamera);
    });
  } finally {
    world.setTime(clock.hour); world.update(elapsed, settings); world.scene.updateMatrixWorld(true);
    applyCameraLight(settings); renderer.shadowMap.needsUpdate = true;
  }
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(base, 0, 0);
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
  if (openingStep !== null || modal.open || capturing || tripod.transitioning || viewfinder.transitioning || meditation || now < shootReadyAt) return;
  if (settings.filter !== equippedFilter(settings.filter, save.economy)) { syncSettings(); openGearShop(); toast('Buy the filter before taking a photograph with it.'); return; }
  if (activeMission.requiredGear && (!missionGearReady(activeMission, save.economy) || equippedLens !== 'telephoto')) { toast('Choose the 200–600 mm wildlife lens in the LENS dropdown.'); return; }
  save.activeShot = currentShot()?.id;
  capturing = true; keys.clear(); shotPhotos = []; shotStoryAdvanced = false; shotId = crypto.randomUUID();
  shotSettings = { ...settings, focalLength, focusMode: focus.mode, focusDistance: focus.mode === 'manual' ? focus.distance : undefined };
  captureSequence.start(now, captureCount(save.economy)); syncTripod();
  captureFrame(now);
}
function captureFrame(now: number) {
  const shot = captureSequence.take(now);
  if (!shot) return;
  const captureSettings = { ...shotSettings! };
  updateCamera(); world.update(elapsed, captureSettings); world.scene.updateMatrixWorld(true);
  const frame = getFraming(), ambientEV = sceneEV();
  captureSettings.focusDistance = captureSettings.focusMode === 'manual' ? captureSettings.focusDistance : autofocus(frame);
  const assessment = assessPhoto(frameMission(), captureSettings, frame, { hour: clock.hour, ambientEV, gearReady: missionGearReady(activeMission, save.economy) && (!activeMission.requiredGear || equippedLens === 'telephoto'), subjectStops: subjectExposureStops(captureSettings, ambientEV, frame.distance, activeMission.category !== 'Astro' && frame.visible && !frame.occluded, subjectImageY()) });
  const result = assessShotView(assessment, activeMission, currentShot(), player.toArray());
  let image: string;
  try { image = makePhoto(captureSettings, frame); }
  catch (error) {
    // Release the controls and retain any earlier burst frames on GPU failure.
    finishShooting(); console.error('Photograph rendering failed', error);
    toast('The photograph could not be rendered. Try again or lower graphics quality in Esc.'); return;
  }
  audio.shutter();
  const photo: Photo = { id: crypto.randomUUID(), missionId: activeMission.id, shotId: currentShot()?.id, image, settings: captureSettings, result, date: Date.now(), studio: activeMission.category === 'Studio' ? normalizeStudioRig(studioRig) : undefined, environment: { hour: clock.hour, cloudCover: sampleSky(clock.hour).cloudCover }, burst: shot.total > 1 ? { id: shotId, index: shot.index, total: shot.total } : undefined };
  save.series = recordShot(save.series, activeMission, currentShot(), photo);
  const ready = seriesReady(activeMission, save.series, result.passed);
  const firstCompletion = ready && !save.completed.includes(activeMission.id);
  const completion = completeMission(save.completed, activeMission.id, ready);
  shotStoryAdvanced ||= firstCompletion && mainStoryIds.includes(activeMission.id);
  save.completed = completion.completed; photo.payment = completion.payment;
  save.photos.unshift(photo); save.photos = save.photos.slice(0, 16); shotPhotos.push(photo);
  $('flash').classList.remove('fire'); void $('flash').offsetWidth; $('flash').classList.add('fire');
  if (shot.last) { shootReadyAt = now + (shot.total === 1 ? 300 : 100); finishShooting(); }
}
function finishShooting() {
  captureSequence.cancel(); capturing = false; syncTripod();
  if (!shotPhotos.length) return;
  persist();
  const best = shotPhotos.reduce((a,b) => b.result.score > a.result.score || (b.result.score === a.result.score && (b.payment ?? 0) > (a.payment ?? 0)) ? b : a);
  const preview = $('capture-preview'); preview.hidden = false;
  const status = best.result.passed ? save.completed.includes(best.missionId) ? '✓ Assignment complete' : `✓ ${seriesCount(activeMission,save.series,save.completed)}/${activeMission.shots!.length} views accepted` : 'Photo saved';
  const label = shotPhotos.length > 1 ? `Burst · ${shotPhotos.length} frames · ${status}` : status;
  preview.innerHTML = `<img src="${esc(best.image)}" alt="${shotPhotos.length > 1 ? 'Best burst frame' : 'Latest photograph'}"/><span>${label}</span>`;
  preview.onclick = () => { preview.hidden = true; openReview(best); };
  window.clearTimeout(previewTimer); previewTimer = window.setTimeout(() => preview.hidden = true, 6000);
  shotPhotos = []; shotSettings = null;
  if (shotStoryAdvanced && best.missionId === 'intro-deer' && best.result.passed && activeMission.id === 'intro-deer') {
    save.walkingIntroduction = false;
    selectMission(missions[0]); setCameraMode(false);
  }
  if (shotStoryAdvanced) openStory();
}

function advanceWorldTime(hours: number) {
  const days = Math.floor((clock.hour + hours) / 24);
  clock.skipTo(clock.hour + hours);
  if (days > 0) {
    const settled = settleDays(save.story, save.economy, save.completed, days);
    save.story = settled.story; save.economy = settled.economy;
    persist();
  }
}
function openStory() {
  const objective = storyObjective(save.story, save.completed);
  const needsPrint = !save.story.deerShown ? !save.story.prints.some(p => p.missionId === 'intro-deer') : save.completed.includes('nature-bear') && !save.story.prints.some(p => p.missionId === 'nature-bear');
  const action = objective.action === 'mission' ? 'Accept this assignment' : objective.action === 'editor' ? 'Find June in the square' : needsPrint ? 'Visit the gallery' : 'Find Arthur’s porch';
  showModal(objective.title, `ARTHUR’S STORY · ${objective.chapter}`, 'A photographer finds a place in Willowbrook.', `<div class="story-scene"><p>${esc(objective.text)}</p><p class="discovery-note">${objective.action === 'editor' ? 'Bring the pictures to June in Morning Paper Square. Press R to talk, then leave the photographs with her.' : objective.action === 'mission' ? 'Follow the main story at your own pace. Side assignments help pay for gear and prints.' : 'The gallery and Arthur’s porch are marked in Esc → Explore. Press R when you arrive.'}</p><button class="primary" id="story-next">${action} ${icon('arrow')}</button></div>`);
  modal.classList.add('story-dialog');
  $('close-modal').setAttribute('aria-label', 'Return to the town');
  $('story-next').onclick = () => {
    if ('missionId' in objective && objective.missionId) {
      save.discovered = storyDiscoveries(save.story, save.completed, save.discovered);
      if (selectMission(missions.find(m => m.id === objective.missionId)!)) { modal.close(); toast('Assignment accepted.'); }
    } else if (objective.action === 'editor') findJune();
    else if (needsPrint) openGallery();
    else guideTo(resolveDestination('place:uncle'));
  };
}
function openGallery(topLevel = false) {
  if (topLevel) pauseTab = 'gallery';
  const nearby = nearStoryPlace(galleryPlace, player.x, player.y, player.z);
  const prints = save.story.prints;
  const candidates = save.photos.filter(p => p.result.passed && save.completed.includes(p.missionId) && !prints.some(print => print.missionId === p.missionId)).filter((p, i, all) => all.findIndex(other => other.missionId === p.missionId) === i);
  const cash = balance(save.economy, save.completed);
  showModal(galleryPlace.name, 'PRINTS · EXHIBITIONS', `Day ${save.story.day} · ${money(cash)} available · ${prints.length} different stories on the wall`, `
    <section class="gallery-status"><h3>${save.story.exhibition ? 'Your exhibition is open.' : 'A wall of your own.'}</h3><p>${save.story.exhibition ? `Visitors bring in $${EXHIBITION_DAILY} each game day.` : `Hang five different successful photographs to open a paid exhibition. It earns $${EXHIBITION_DAILY} each game day.`} Prints cost $${PRINT_PRICE}; the deer and Arthur’s bear print are free.</p><p class="discovery-note">${nearby ? 'You are at the gallery. Prints below will be framed and hung here.' : 'Visit the gallery beside the garden, then press R to print and open your exhibition.'}</p><div class="pause-actions"><button class="secondary" id="gallery-map">Walk to the gallery ${icon('compass')}</button>${!save.story.exhibition ? `<button class="primary" id="start-exhibition" ${nearby && prints.length >= 5 ? '' : 'disabled'}>Open paid exhibition · ${Math.min(5, prints.length)}/5</button>` : ''}</div></section>
    <section class="living-status"><h3>${save.story.home === 'cottage' ? 'Your garden cottage' : 'Your room in town'}</h3><p>${save.story.home === 'cottage' ? 'You own the cottage. No daily rent.' : save.story.deerShown ? `Rent is $${ROOM_RENT} per game day. A garden cottage costs $${COTTAGE_PRICE}; ask Arthur at his porch.` : 'Mara has arranged a room. Rent starts after you show Arthur the deer print.'}${save.story.rentArrears ? ` ${money(save.story.rentArrears)} in rent is waiting; it will be settled from future funds at midnight.` : ''}</p><p class="discovery-note">Income and rent settle at midnight. Menus pause time; meditation advances it. No charges or income while you are away.</p><p class="discovery-note">Exhibitions earned ${money(save.economy.living?.exhibitionIncome ?? 0)} · Rent paid ${money(save.economy.living?.rentPaid ?? 0)} · Printing ${money(save.economy.living?.printCosts ?? 0)}</p></section>
    ${prints.length ? `<h3>On the wall</h3><div class="journal-grid">${prints.map(print => `<article class="photo-card"><img src="${esc(print.image)}" alt="Framed ${esc(missions.find(m => m.id === print.missionId)!.title)}"/><h3>${esc(missions.find(m => m.id === print.missionId)!.title)}</h3><p>Printed and exhibited · Kept in the gallery</p></article>`).join('')}</div>` : '<p class="discovery-note">Your first print will live here, even when the journal makes room for newer photographs.</p>'}
    <h3>Ready to print</h3>${candidates.length ? `<div class="journal-grid">${candidates.map(photo => `<article class="photo-card"><img src="${esc(photo.image)}" alt="Print preview"/><h3>${esc(missions.find(m => m.id === photo.missionId)!.title)}</h3><button class="secondary" data-print="${photo.id}" ${nearby && (['intro-deer', 'nature-bear'].includes(photo.missionId) || cash >= PRINT_PRICE) ? '' : 'disabled'}>Print & hang · ${['intro-deer', 'nature-bear'].includes(photo.missionId) ? 'Free' : money(PRINT_PRICE)}</button></article>`).join('')}</div>` : '<p class="discovery-note">Complete an assignment to add a new print. For a photo set, finish all required views first; one representative frame is hung for each story. You can replay completed assignments if an older frame has left your journal.</p>'}`, topLevel ? 'menu' : 'page');
  $('gallery-map').onclick = () => guideTo(resolveDestination('place:gallery'));
  if ($('start-exhibition')) $('start-exhibition').onclick = () => {
    if (!nearStoryPlace(galleryPlace, player.x, player.y, player.z)) return;
    save.story = startExhibition(save.story); persist(); openGallery(topLevel); toast('Your exhibition is open. $5 each game day, beginning at the next midnight.');
  };
  modal.querySelectorAll<HTMLButtonElement>('[data-print]').forEach(button => button.onclick = () => {
    if (!nearStoryPlace(galleryPlace, player.x, player.y, player.z)) return;
    const photo = save.photos.find(p => p.id === button.dataset.print);
    if (!photo) return;
    const result = printPhoto(save.story, save.economy, save.completed, photo);
    if (!result.ok) { toast(result.reason); return; }
    save.story = result.story; save.economy = result.economy; world.storyPlaces.displayPrints(save.story.prints); persist(); openGallery(topLevel);
    toast(['intro-deer', 'nature-bear'].includes(photo.missionId) ? 'Your print is on the gallery wall. Bring Arthur the story at his porch.' : 'Printed and hung in your gallery.');
  });
}
function openUncle(memoryId?: string) {
  const before = save.story;
  save.story = visitUncle(save.story, save.completed); persist();
  const ending = !before.reconciled && save.story.reconciled;
  const first = !before.deerShown && save.story.deerShown;
  const line = ending ? 'There it is. Just as I remember. You came all this way for a photograph, but you stayed. I’m glad we have this time together. Sit with me a while.' : first ? 'Look at that deer. You waited, and you let it be itself. You always had an eye for things. Alma stopped by your exhibition wall; she has a wedding coming up and wants to meet our new photographer.' : save.story.workshopShared ? 'Ruth brought the paper. She said you asked what the harbor needed, too. Your mother would have liked that. Caring for a place means making room for the people trying to stay in it. Tell me about those apprentices.' : save.story.reconciled ? 'I keep your bear beside my chair. Tell me what you saw today.' : !save.story.deerShown ? 'I would love to see your first photograph. Print the deer at the gallery, then come sit with me. The bear can wait until you have a long lens.' : save.story.reportPublished ? 'June brought the paper. The path is still there, for now. Your mother would have gone to that hearing with a flask and a hundred questions. Take your time with the bear. I would rather have you here than a perfect photograph.' : save.completed.includes('news-townhall') ? 'June told me about the road proposal. Your mother and I kept that footpath clear for years. Go and look at it before you decide what the meeting means. People deserve the whole picture.' : 'I hear the town is getting to know you. Do you remember that camera I sent? I hoped you would bring it home one day. The bear can wait. Tell me about your day.';
  const memory = arthurMemories.find(item => item.id === memoryId);
  const album = horizonAlbum(save.story);
  const price = COTTAGE_PRICE + save.story.rentArrears;
  showModal(ending ? 'A little time together.' : 'Uncle Arthur', ending ? 'ARTHUR’S STORY · HOME, AT LAST' : 'ARTHUR’S PORCH', ending ? 'The photograph is home. So are you.' : 'The kettle is on. There is a chair for you.', `<p class="npc-dialogue">“${esc(line)}”</p>${ending ? '<p class="conversation-coda">You start to apologise for the years you let pass. Arthur shakes his head. “I let them pass, too.” You sit beside him as the light turns. There is no photograph to make, and nowhere else you need to be.</p>' : ''}<section class="arthur-memories"><h3>Stay for a cup of tea</h3><p class="discovery-note">There is time to talk. You can return to these conversations whenever you like.</p><div class="pause-actions">${arthurMemories.map(item => `<button class="secondary" data-memory="${item.id}" aria-pressed="${memoryId === item.id}">${esc(item.title)}${save.story.memories.includes(item.id) ? ' · Remembered' : ''}</button>`).join('')}</div>${memory ? `<p class="npc-dialogue">${esc(memory.text)}</p>` : ''}</section>${save.story.deerShown ? `<section class="horizon-album"><span class="eyebrow">AN ALBUM FOR ARTHUR · ${album.filter(p => p.printed).length} / 4 PRINTS</span><h3>Four places. A lifetime between them.</h3><p class="npc-dialogue">${esc(horizonAlbumDialogue(save.story))}</p><div class="pause-actions">${album.map(p => `<button class="secondary" data-horizon="${p.id}">${p.printed ? '✓ ' : ''}${p.name}</button>`).join('')}</div></section>` : ''}<section class="living-status"><h3>${save.story.home === 'cottage' ? 'A home of your own' : 'Settle into Willowbrook'}</h3><p>${save.story.home === 'cottage' ? 'Your garden cottage is on the southern street. You can keep photographing and running the gallery.' : `Your room costs $${ROOM_RENT} per game day after your first visit with the deer print. The garden cottage is available for $${COTTAGE_PRICE}, with no daily rent.${save.story.rentArrears ? ` Clear ${money(save.story.rentArrears)} in waiting rent as part of the purchase.` : ''}`}</p>${save.story.home === 'room' ? `<button class="secondary" id="buy-home" ${save.story.deerShown && balance(save.economy, save.completed) >= price ? '' : 'disabled'}>Buy garden cottage · ${money(price)}</button>` : ''}</section><div class="review-actions"><button class="secondary" id="uncle-gallery">View the gallery</button><button class="primary" id="uncle-next">${ending || save.story.reconciled ? 'Keep exploring' : 'Continue the story'} ${icon('arrow')}</button></div>`);
  if (memory) {
    const memoryLine = modal.querySelector<HTMLElement>('.npc-dialogue')!;
    memoryLine.textContent = memory.text; memoryLine.dataset.narrative = 'true';
    modal.querySelector('.arthur-memories .npc-dialogue')?.remove();
  }
  beginConversation('arthur');
  if (memory) modal.querySelector('.modal-header .eyebrow')!.textContent = `ARTHUR’S PORCH · ${memory.title}`;
  if ($('buy-home')) $('buy-home').onclick = () => {
    if (!nearStoryPlace(unclePlace, player.x, player.y, player.z)) return;
    const result = buyCottage(save.story, save.economy, save.completed);
    if (!result.ok) return;
    save.story = result.story; save.economy = result.economy; persist(); openUncle(); toast('The garden cottage is yours. Find it on the map.');
  };
  modal.querySelectorAll<HTMLButtonElement>('[data-memory]').forEach(button => button.onclick = () => {
    save.story = rememberArthur(save.story, button.dataset.memory!); persist(); openUncle(button.dataset.memory);
    modal.querySelector<HTMLElement>('.npc-dialogue')?.focus({preventScroll:true});
  });
  modal.querySelectorAll<HTMLButtonElement>('[data-horizon]').forEach(button => button.onclick = () => openLandmarkHistory(button.dataset.horizon!));
  $('uncle-gallery').onclick = () => openGallery();
  $('uncle-next').onclick = () => { if (save.story.reconciled) modal.close(); else openStory(); };
}

function showModal(title: string, eyebrow: string, subtitle: string, content: string, view: 'menu' | 'page' = 'page') {
  if (capturing) finishShooting();
  conversationSpeaker = undefined;
  modal.classList.remove('conversation-dialog', 'story-dialog'); stage.classList.remove('in-conversation');
  keys.clear(); drag = false; audio.silence();
  modal.innerHTML = `<div class="modal-header"><div><div class="eyebrow">${esc(eyebrow)}</div><h2 id="modal-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="close" id="close-modal" aria-label="Resume game">${icon('close')}</button></div>${view === 'menu' ? pauseNavigation() : ''}<div class="modal-body" ${view === 'menu' ? `id="pause-panel" role="tabpanel" aria-labelledby="tab-${pauseTab}"` : ''}>${content}</div>${view === 'menu' ? '<div class="pause-footer"><div><span id="menu-progress"></span><small id="save-status"></small></div><button class="primary" id="resume">Resume <kbd>Esc</kbd></button></div>' : ''}`;
  if (!modal.open) modal.showModal();
  $('close-modal').onclick = leaveModal;
  if (view === 'menu') {
    $('resume').onclick = () => modal.close(); updateProgress();
    const tabs = [...modal.querySelectorAll<HTMLButtonElement>('[data-pause-tab]')];
    tabs.forEach((button, index) => {
      button.onclick = () => { openPauseMenu(button.dataset.pauseTab as PauseTab); $(`tab-${pauseTab}`).focus(); };
      button.onkeydown = e => {
        let next = index;
        if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault(); tabs[next].click();
      };
    });
    $(`tab-${pauseTab}`).focus({ preventScroll: true });
  }
}
function beginConversation(speaker: string) {
  modal.classList.add('conversation-dialog'); stage.classList.add('in-conversation');
  conversationSpeaker = world.scene.getObjectByName(speakerObjectName(speaker));
  conversationFrame = '';
  $('close-modal').setAttribute('aria-label', 'End conversation and return to the town');
  const line = modal.querySelector<HTMLElement>('.npc-dialogue');
  if (!line) return;
  const narrative = line.dataset.narrative === 'true';
  const original = narrative ? line.textContent ?? '' : line.textContent?.replace(/^“|”$/g, '') ?? '';
  line.tabIndex = -1;
  line.setAttribute('aria-live', 'polite'); line.setAttribute('aria-atomic', 'true');
  const navigation = document.createElement('div'); navigation.className = 'dialogue-navigation';
  navigation.innerHTML = '<button class="secondary" data-dialogue-back aria-label="Previous dialogue page">←</button><span data-dialogue-count></span><button class="secondary" data-dialogue-next>Continue →</button>';
  line.after(navigation);
  let pages: string[] = [], page = 0;
  const paint = () => {
    line.textContent = narrative ? pages[page] : `“${pages[page]}”`;
    navigation.hidden = pages.length < 2;
    navigation.querySelector('[data-dialogue-count]')!.textContent = `${page + 1} / ${pages.length}`;
    (navigation.querySelector('[data-dialogue-back]') as HTMLButtonElement).disabled = page === 0;
    (navigation.querySelector('[data-dialogue-next]') as HTMLButtonElement).disabled = page === pages.length - 1;
    audio.speak(speaker, pages[page]);
  };
  const say = (text: string) => { pages = dialoguePages(text); if (!pages.length) pages = ['…']; page = 0; paint(); };
  navigation.querySelector<HTMLButtonElement>('[data-dialogue-back]')!.onclick = () => { if (page > 0) { page--; paint(); } };
  navigation.querySelector<HTMLButtonElement>('[data-dialogue-next]')!.onclick = () => { if (page < pages.length - 1) { page++; paint(); } };
  const topics = conversationTopics(speaker, save.story);
  if (topics.length) {
    const questions = document.createElement('div'); questions.className = 'conversation-questions';
    questions.setAttribute('role', 'group'); questions.setAttribute('aria-label', 'Ask a personal question');
    questions.innerHTML = topics.map(topic => `<button class="secondary" data-topic="${topic.id}" aria-pressed="false">${esc(topic.question)}</button>`).join('') + '<button class="secondary" data-topic="brief" aria-pressed="true">About the photographs</button>';
    navigation.after(questions);
    questions.querySelectorAll<HTMLButtonElement>('[data-topic]').forEach(button => button.onclick = () => {
      questions.querySelectorAll('[data-topic]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      say(topics.find(topic => topic.id === button.dataset.topic)?.answer ?? original);
    });
  }
  // Leave the spoken words in view; fold longer briefs and porch activities.
  const body = modal.querySelector('.modal-body')!;
  const extras = [...body.children].filter(item => item !== line && item !== navigation && !item.classList.contains('conversation-questions') && !item.classList.contains('review-actions') && !item.matches('button.primary, .conversation-coda') && !(speaker !== 'arthur' && item.classList.contains('pause-actions')));
  if (extras.length) {
    const details = document.createElement('details'); details.className = 'conversation-details';
    details.innerHTML = `<summary>${speaker === 'arthur' ? 'Stay for tea · memories, album & home' : 'Assignments & next steps'}</summary>`;
    extras[0].before(details); extras.forEach(item => details.append(item));
  }
  const footer = body.querySelector('.review-actions');
  if (footer) modal.append(footer);
  say(original);
}

function missionCard(m: Mission) {
  const ready = missionGearReady(m, save.economy);
  return `<button class="assignment-card ${ready ? '' : 'mission-locked'}" data-mission="${m.id}"><span class="eyebrow">${icon(categoryIcon[m.category])}${mainStoryIds.includes(m.id) ? 'Main story' : 'Side assignment'} · ${m.category} · ${esc(m.location)}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>${ready ? '' : '<p class="gear-requirement">Requires 200–600 mm lens · $480 · Visit camera store →</p>'}<span class="card-footer"><span>${save.completed.includes(m.id) ? '✓ Story told' : m.shots ? `${seriesCount(m,save.series,save.completed)}/${m.shots.length} views accepted` : m.timeWindow ? esc(m.timeWindow.label) : 'Any time'}</span><span>${save.completed.includes(m.id) ? 'Replay · no extra payment' : `${m.payment ? `${money(m.payment)} · ` : ''}${m.reward} XP →`}</span></span></button>`;
}
function wireMissionCards() {
  modal.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach(b => b.onclick = () => {
    if (selectMission(missions.find(m => m.id === b.dataset.mission)!)) { modal.close(); toast('Assignment accepted.'); }
  });
}
function openBoard() {
  pauseTab = 'assignments';
  const sections: [MissionSection, string][] = [['active', 'Active'], ['available', 'Available'], ['completed', 'Completed']];
  const list = notebookMissions(save.discovered, save.completed, activeMission.id, missionSection);
  const content = missionSection === 'active' ? activeMissionContent() : `<div class="mission-grid">${list.map(missionCard).join('')}</div>${list.length ? '' : `<div class="empty"><h3>${missionSection === 'completed' ? 'Your stories will live here.' : 'More stories are out there.'}</h3><p>${missionSection === 'completed' ? 'Finish an assignment to add it to your completed collection.' : 'Talk to locals to discover your next assignment.'}</p></div>`}`;
  showModal('Your field notebook.', 'PAUSED · ASSIGNMENTS', 'One active story at a time. Completed assignments stay here to revisit.', `<section class="story-summary"><span class="eyebrow">${esc(storyObjective(save.story, save.completed).chapter)}</span><h3>${esc(storyObjective(save.story, save.completed).title)}</h3><p>${esc(storyObjective(save.story, save.completed).text)}</p><button class="secondary" id="story-details">Continue the story ${icon('arrow')}</button></section>${workshopSummary()}<div class="mission-sections" role="group" aria-label="Assignment status">${sections.map(([id, label]) => `<button data-mission-section="${id}" aria-pressed="${missionSection === id}">${label}<span>${notebookMissions(save.discovered, save.completed, activeMission.id, id).length}</span></button>`).join('')}</div>${content}<p class="discovery-note notebook-hint">${save.discovered.length} of ${missions.length} stories discovered · Press R near a local to find more.</p>`, 'menu');
  modal.querySelectorAll<HTMLButtonElement>('[data-mission-section]').forEach(b => b.onclick = () => { missionSection = b.dataset.missionSection as MissionSection; openBoard(); modal.querySelector<HTMLButtonElement>(`[data-mission-section="${missionSection}"]`)?.focus(); });
  if ($('walk-assignment')) $('walk-assignment').onclick = () => guideTo(assignmentDestination());
  if ($('travel')) $('travel').onclick = () => { if (save.walkingIntroduction) openPauseMenu('explore'); else { modal.close(); travelTo(activeMission); } };
  if ($('suggest')) $('suggest').onclick = suggestSettings;
  modal.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(b=>b.onclick=()=>{chooseShot(b.dataset.shot!);openBoard();modal.querySelector<HTMLButtonElement>(`[data-shot="${save.activeShot}"]`)?.focus();});
  if ($('choose-available')) $('choose-available').onclick = () => { missionSection = 'available'; openBoard(); };
  wireMissionCards(); $('story-details').onclick = openStory;
  if ($('workshop-map')) $('workshop-map').onclick = () => openPauseMenu('explore');
}
function findJune() {
  const [x,,z] = world.npcPosition('editor');
  const spot = [[x + 2.5,z],[x - 2.5,z],[x,z + 2.5],[x,z - 2.5]].find(([px,pz]) => world.canWalk(px,pz));
  if (!spot) { openPauseMenu('explore'); return; }
  requestTripod(false, true); player.set(spot[0], world.groundHeight(...spot as [number, number]) + eyeHeight, spot[1]);
  const direction = new THREE.Vector3(x, world.groundHeight(x,z) + 1.5, z).sub(player);
  yaw = Math.atan2(-direction.x, -direction.z); pitch = Math.atan2(direction.y, Math.hypot(direction.x,direction.z));
  setCameraMode(false); modal.close(); persist();
}
function openLandmarkHistory(id: string) {
  const place = regionalLandmarks.find(p => p.id === id)!;
  const mission = missions.find(m => m.id === place.mission)!;
  showModal(place.name, 'ARTHUR’S FOUR HORIZONS', place.subtitle, `<p class="npc-dialogue">${esc(place.memory)}</p><p>${esc(place.description)}</p>${save.story.deerShown ? `<div class="mission-grid">${missionCard(mission)}</div>` : '<p class="discovery-note">Bring Arthur your first deer print. He has four old postcards to share when you settle in.</p>'}<p class="discovery-note">Follow the pale trails from town, or find this place in Esc → Explore. At the history board, press R to read again.</p><button class="secondary" id="history-map">See the trails ${icon('map')}</button>`);
  if (save.story.deerShown) { save.discovered = storyDiscoveries(save.story, save.completed, save.discovered); persist(); wireMissionCards(); }
  $('history-map').onclick = () => openPauseMenu('explore');
}
function openPaper() {
  showModal('The Willowbrook Paper', 'MORNING PAPER SQUARE', save.story.reportPublished ? 'The town is asking its own questions.' : 'A small paper, read by the people in its photographs.', save.story.reportPublished
    ? `<h3>Woodland road proposal paused for public hearing</h3><p>Photographs of an after-hours meeting and the marked route led residents to ask how the proposed road would affect the northern footpath. June checked the public planning register and sought a response from Councillor Vale.</p><p>Vale describes the route as preliminary. The council will hold an open hearing before deciding; the existing public footpath remains open. The proposal has not been cancelled.</p>${save.story.workshopShared ? '<h3>Harbor crew asks about a different route</h3><p>Boatbuilder Ruth and apprentices Nessa and Kit suggest a delivery bay off the existing harbor lane. Their photographs show the repair work that depends on reliable deliveries. The idea still needs costing and an access study; no alternative has been approved.</p><p>Captions checked with the crew · Photographs by you</p>' : '<p>Ruth at Tidewright Workshop has asked how timber deliveries can keep reaching the harbor. Her crew will bring their questions to the hearing, too.</p>'}<p class="discovery-note">Reporting by June · Photographs by Willowbrook’s newest neighbour</p>`
    : '<h3>The path we share</h3><p>The running club is raising funds to repair the ridge steps that Arthur maintained for years. Theo says volunteers will carry the materials uphill this spring.</p><p>The public planning register lists a proposed northern access road. Plans can be inspected at the town hall. June welcomes questions in the square.</p>');
}
function workshopSummary() {
  if (!save.story.deerShown) return '';
  const count = workshopMissionIds.filter(id => save.story.prints.some(p => p.missionId === id)).length;
  return `<section class="story-summary"><span class="eyebrow">HARBOR STORIES · OPTIONAL · ${count}/2 PRINTS</span><h3>${save.story.workshopShared ? 'A place for every voice' : 'The people at the other end of the road'}</h3><p>${save.story.workshopShared ? 'Ruth and the apprentices have shared their photographs and a delivery bay sketch with June. The hearing still has questions to answer.' : !save.story.workshopMet ? 'Follow the lane south of the houses to Tidewright Workshop. Ruth knew Arthur long before you came home. She has another side of the woodland road story to share.' : save.completed.includes('harbor-crew') ? 'Print both workshop photographs at the gallery, then bring them to Ruth. The crew will check their captions before sharing them with June.' : save.story.reportPublished && save.completed.includes('harbor-portrait') ? 'The crew have an idea for a delivery bay by the existing lane. Return to Ruth for a photograph that gives everyone a place in the discussion.' : save.completed.includes('harbor-portrait') ? 'Ruth’s portrait is ready. Print it at the gallery, or continue June’s investigation to learn more about the proposed road. The crew have another story when the report is published.' : 'Ruth has invited you to photograph her and the unfinished boat. The harbor needs deliveries, and the woods need care. There is room in a photograph for both.'}</p><button class="secondary" id="workshop-map">Find Tidewright Workshop ${icon('map')}</button></section>`;
}
function openWorkshop() {
  if (!nearStoryPlace(workshopPlace, player.x, player.y, player.z)) return;
  save.story = meetWorkshop(save.story); persist();
  const shared = save.story.workshopShared;
  const ready = !shared && save.story.reportPublished && workshopMissionIds.every(id => save.story.prints.some(p => p.missionId === id));
  const line = workshopDialogue(save.story, save.completed);
  showModal(shared ? 'A place for every voice.' : 'Ruth', 'TIDEWRIGHT WORKSHOP · RUTH, NESSA & KIT', 'The smell of timber. A kettle on the bench. Three people keeping boats afloat.', `<p class="npc-dialogue">“${esc(line)}”</p>${save.story.deerShown ? `<div class="mission-grid">${missions.filter(m => workshopMissionIds.includes(m.id) && storyMissionUnlocked(m.id, save.story, save.completed)).map(missionCard).join('')}</div>${!storyMissionUnlocked('harbor-crew',save.story,save.completed) ? '<p class="discovery-note">The crew assignment opens after both views of Ruth’s portrait and June’s woodland report. Arthur’s story continues at your own pace.</p>' : ''}<p class="discovery-note">${workshopMissionIds.filter(id => save.story.prints.some(p => p.missionId === id)).length}/2 workshop photographs printed. Bring both prints here to check names and captions together.</p>${!shared ? `<button class="primary" id="share-workshop" ${ready ? '' : 'disabled'}>Check captions and share with June</button>` : '<p>Ruth writes: “Nessa and Kit, apprentice boatbuilders. Existing harbor lane; delivery bay suggested for review.” You all sign the back of the prints. June will publish the crew’s words beside their photographs.</p>'}` : ''}<div class="review-actions"><button class="secondary" id="workshop-gallery">Visit the gallery</button><button class="primary" id="leave-workshop">Keep exploring ${icon('arrow')}</button></div>`);
  beginConversation('boatbuilder');
  wireMissionCards();
  $('leave-workshop').onclick = () => modal.close();
  $('workshop-gallery').onclick = () => openGallery();
  if ($('share-workshop')) $('share-workshop').onclick = () => {
    if (!nearStoryPlace(workshopPlace,player.x,player.y,player.z)) return;
    save.story = shareWorkshop(save.story); persist(); openWorkshop();
  };
}
function talkToNPC() {
  if (modal.open || capturing || meditation || tripod.transitioning) return;
  if (atCameraStore(player.x, player.y, player.z)) { openGearShop(); return; }
  if (nearStoryPlace(galleryPlace, player.x, player.y, player.z)) { openGallery(); return; }
  if (nearStoryPlace(unclePlace, player.x, player.y, player.z)) { openUncle(); return; }
  if (nearStoryPlace(paperPlace, player.x, player.y, player.z)) { openPaper(); return; }
  if (nearStoryPlace(workshopPlace, player.x, player.y, player.z)) { openWorkshop(); return; }
  const region = nearestLandmark(player.x, player.z);
  if (region) { openLandmarkHistory(region.id); return; }
  const npc = nearestNPC(player.x, player.y, player.z, npc => world.npcPosition(npc.id));
  if (!npc) return;
  const before = save.discovered.length;
  save.discovered = storyDiscoveries(save.story, save.completed, discoverNPC(save.discovered, npc)); persist();
  showModal(npc.name, npc.role.toUpperCase(), `${save.discovered.length - before ? `${save.discovered.length - before} new stories added to your notebook` : 'A familiar face in Willowbrook'}`, `<p class="npc-dialogue">“${esc(npc.missions.some(id => storyMissionUnlocked(id, save.story, save.completed)) ? localStoryDialogue(npc.id, save.story, save.completed, npc.dialogue) : 'Welcome to Willowbrook. Settle in and show Arthur your first photograph. We’ll have work for you as the town gets to know you.')}”</p>${npc.id === 'editor' && !save.story.reportPublished && save.completed.includes('news-townhall') && save.completed.includes('news-boundary') ? '<div class="pause-actions"><button class="primary" id="deliver-report">Leave both photographs with June</button></div>' : ''}<div class="mission-grid">${missions.filter(m => (npc.missions as readonly string[]).includes(m.id) && storyMissionUnlocked(m.id, save.story, save.completed)).map(missionCard).join('')}</div><div class="review-actions"><span class="discovery-note">These stories stay in your notebook for later.</span><button class="primary" id="leave-npc">Keep exploring ${icon('arrow')}</button></div>`);
  beginConversation(npc.id);
  wireMissionCards(); $('leave-npc').onclick = () => modal.close();
  if ($('deliver-report')) $('deliver-report').onclick = () => {
    if (nearestNPC(player.x, player.y, player.z, npc => world.npcPosition(npc.id))?.id !== 'editor') return;
    save.story = publishReport(save.story, save.completed); persist();
    showModal('The whole picture', 'JUNE · THE WILLOWBROOK PAPER', 'Later, after June checks the register and asks Vale for a response.', `<p class="npc-dialogue">“${esc(localStoryDialogue('editor', save.story, save.completed, ''))}”</p><p>The new edition is on the noticeboard in the square. The woodland planning notice now lists the public hearing. Mara has news of Arthur’s bear.</p><button class="primary" id="report-next">Back to Arthur’s story ${icon('arrow')}</button>`);
    beginConversation('editor');
    $('report-next').onclick = openStory;
  };
}
function updateNPCPrompt() {
  const npc: NPC | undefined = nearestNPC(player.x, player.y, player.z, npc => world.npcPosition(npc.id));
  const prompt = $('npc-prompt');
  const region = nearestLandmark(player.x, player.z);
  const storeNearby = atCameraStore(player.x, player.y, player.z);
  const storyPlace = nearStoryPlace(galleryPlace, player.x, player.y, player.z) ? galleryPlace : nearStoryPlace(unclePlace, player.x, player.y, player.z) ? unclePlace : nearStoryPlace(paperPlace, player.x, player.y, player.z) ? paperPlace : nearStoryPlace(workshopPlace, player.x, player.y, player.z) ? workshopPlace : undefined;
  prompt.hidden = cameraMode || (!npc && !storeNearby && !storyPlace && !region) || modal.open || capturing || tripod.transitioning || !!meditation;
  if (storeNearby) { prompt.dataset.npc = 'camera-store'; prompt.innerHTML = `<kbd>R</kbd> Camera store`; return; }
  if (storyPlace) { prompt.dataset.npc = storyPlace.name; prompt.innerHTML = `<kbd>R</kbd> ${storyPlace === galleryPlace ? 'Gallery' : storyPlace === paperPlace ? 'Newspaper' : storyPlace === workshopPlace ? 'Ruth · Workshop' : 'Arthur'}`; return; }
  if (region) { prompt.dataset.npc = region.id; prompt.innerHTML = `<kbd>R</kbd> History board`; return; }
  const promptKey = npc ? `${npc.id}-${localActivity(npc.id, clock.hour)}` : '';
  if (npc && prompt.dataset.npc !== promptKey) { prompt.dataset.npc = promptKey; prompt.innerHTML = `<kbd>R</kbd> ${esc(npc.name)}`; }
}
function openJournal(topLevel = false) {
  if (topLevel) pauseTab = 'journal';
  showModal('Your way of seeing.', 'THE PHOTO JOURNAL', `${save.photos.length} photographs collected · ${save.completed.length} stories told. The latest 16 photos are kept on this device.`, save.photos.length ? `<div class="journal-grid">${save.photos.map(p => { const m = missions.find(m => m.id === p.missionId)!; return `<button class="photo-card" data-photo="${p.id}"><img src="${esc(p.image)}" alt="Your photograph for ${esc(m.title)}"/><h3>${esc(m.title)}</h3><p>${m.category}${p.shotId ? ` · ${esc(m.shots?.find(s=>s.id===p.shotId)?.title ?? '')}` : ''} · ${p.result.passed ? save.completed.includes(m.id) ? '✓ Assignment complete' : '✓ View accepted · set in progress' : 'A work in progress'} · ${p.result.score}/100${p.burst ? ` · Burst ${p.burst.index}/${p.burst.total}` : ''}</p></button>`; }).join('')}</div>` : `<div class="empty">${icon('camera')}<h3>Every photographer starts here.</h3><p>Explore the world, find something worth noticing,<br/>and press Space to make your first photograph.</p></div>`, topLevel ? 'menu' : 'page');
  modal.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(b => b.onclick = () => openReview(save.photos.find(p => p.id === b.dataset.photo)!));
}
function openReview(photo: Photo) {
  const m = missions.find(m => m.id === photo.missionId)!;
  const { result, settings: s } = photo;
  const complete = save.completed.includes(m.id);
  const partial = !!m.shots && !complete;
  const shot = m.shots?.find(s=>s.id===photo.shotId);
  const verdict = result.passed ? partial ? `View accepted · ${seriesCount(m,save.series,save.completed)}/${m.shots!.length} · ${money(m.payment)} paid when the set is complete` : `Assignment complete · ${m.shots ? `${seriesCount(m,save.series,save.completed)}/${m.shots.length} views · ` : ''}${m.payment === 0 ? m.id === 'nature-bear' ? 'A gift for Arthur' : 'First photograph' : photo.payment ? `${money(photo.payment)} paid` : 'Payment already earned'} · ${m.reward} XP` : 'Keep exploring. Every attempt teaches you something.';
  showModal(result.passed ? partial ? 'One view of a bigger story.' : 'A story worth keeping.' : 'One frame closer.', 'IN THE DARKROOM', `${m.title}${shot ? ` · ${shot.title}` : ''} · ${m.location}`, `
    <div class="review-layout"><div><img class="review-photo" src="${esc(photo.image)}" alt="Your captured photograph"/><div class="photo-settings"><span>${shutterLabel(s.shutter)}${s.shutter < 0.25 ? ' s' : ''}</span><span>f/${s.aperture}</span><span>ISO ${s.iso}</span>${s.focalLength ? `<span>${Math.round(s.focalLength)} mm</span>` : ''}${s.focusDistance && Number.isFinite(s.focusDistance) ? `<span>${s.focusMode === 'manual' ? 'MF' : 'AF'} ${s.focusDistance >= 1e5 ? '∞' : `${s.focusDistance.toFixed(1)} m`}</span>` : ''}${photo.burst ? `<span>Burst ${photo.burst.index}/${photo.burst.total}</span>` : ''}${Number.isFinite(photo.environment?.hour) ? `<span>${formatTime(photo.environment!.hour)} · ${Math.round(photo.environment!.cloudCover * 100)}% cloud cover</span>` : ''}<span>${filterLabel(s.filter)}${s.filter === 'gnd3' ? ` · transition ${Math.round(gradientPosition(s.gradPosition) * 100)}%` : ''}</span>${s.tripod ? '<span>Tripod</span>' : ''}${s.panning ? '<span>Panning</span>' : ''}${flashPower(s) > 0 ? `<span>Flash ${flashPower(s) === 1 ? 'full' : `1/${Math.round(1 / flashPower(s))}`} ${flashCanFire(s) ? '' : '(not synced)'}</span>` : ''}${photo.studio ? `<span>Studio: ${lightNames.map(n => `${n} ${photo.studio![n].enabled ? Math.round(photo.studio![n].power * 100) : 0}%`).join(' · ')}</span>` : ''}</div><p style="font-size:9px;color:var(--muted);line-height:1.6;margin-top:14px">Exposure and lighting falloff are calculated. Depth of field uses scene depth and lens settings; motion accumulates over the shutter interval. Optics and noise remain simplified.</p></div>
    <div><div class="review-score">${result.score}<small> / 100</small></div><p class="review-verdict">${esc(verdict)}</p>${result.feedback.map(f => `<div class="feedback-row ${f.passed ? '' : 'missed'}"><span class="feedback-icon">${icon(f.passed ? 'check' : 'info')}</span><div><strong>${esc(f.label)}</strong><p>${esc(f.text)}</p></div></div>`).join('')}</div></div>
    ${seriesChecklist(m)}
    <div class="review-actions"><a class="secondary" id="download-photo" style="text-decoration:none;color:inherit" href="${esc(photo.image)}" download="willowbrook-${m.id}-${photo.date}.jpg">${icon('download')}Keep a copy</a>${result.passed && complete ? '<button class="secondary" id="review-gallery">Print at the gallery</button>' : ''}<button class="primary" id="review-next">${result.passed ? partial ? 'Choose the next view' : 'Find another story' : 'Try another frame'}${icon('arrow')}</button></div>`);
  if ($('review-gallery')) $('review-gallery').onclick = () => openGallery();
  $('review-next').onclick = () => {
    if (partial && result.passed) { if (selectMission(m)) openPauseMenu('assignments'); }
    else if (result.passed) { missionSection = 'available'; openPauseMenu('assignments'); }
    else { if (selectMission(m) && shot) chooseShot(shot.id); modal.close(); setCameraMode(true); }
  };
}

function drawMap(canvas: HTMLCanvasElement, townDetail = false) {
  const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height;
  const half = townDetail ? 115 : WORLD_HALF, centreZ = townDetail ? 5 : 0;
  const mx = (x: number) => (x + half) / (half * 2) * w, mz = (z: number) => (z - centreZ + half) / (half * 2) * h;
  for (let x = 0; x < w; x += 5) for (let z = 0; z < h; z += 5) {
    const height = terrainHeight(x / w * half * 2 - half, z / h * half * 2 - half + centreZ);
    ctx.fillStyle = `hsl(210, 15%, ${Math.max(9, 22 - height * 0.35)}%)`; ctx.fillRect(x, z, 5, 5);
  }
  ctx.fillStyle = '#223e4c'; ctx.beginPath(); ctx.moveTo(mx(-WORLD_HALF),mz(WORLD_HALF));
  for(let x=-WORLD_HALF;x<=WORLD_HALF;x+=4) ctx.lineTo(mx(x),mz(coastline(x)));
  ctx.lineTo(mx(WORLD_HALF),mz(WORLD_HALF)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#65717e'; ctx.lineWidth = 6;
  ctx.beginPath(); townRoad.forEach(([x,z],i) => i ? ctx.lineTo(mx(x),mz(z)) : ctx.moveTo(mx(x),mz(z))); ctx.stroke();
  ctx.beginPath();ctx.moveTo(mx(48),mz(17));ctx.lineTo(mx(48),mz(37));ctx.stroke();
  ctx.strokeStyle = '#a6977d'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const trail of [...trails, [[-44,16],[43,16]], [[15,-38],[15,32]], [[-35,25],[5,25]]]) {
    ctx.beginPath(); trail.forEach(([x,z],i) => i ? ctx.lineTo(mx(x),mz(z)) : ctx.moveTo(mx(x),mz(z))); ctx.stroke();
  }
  ctx.fillStyle = '#2b5260'; ctx.fillRect(mx(-21), mz(-14.5), 28 / (half * 2) * w, 23 / (half * 2) * h);
  ctx.beginPath(); ctx.ellipse(mx(76), mz(-54), 14 / (half * 2) * w, 11 / (half * 2) * h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  for (const [x,z,label] of [[0,30,'Willowbrook'],[-73,64,'Wildflower meadow'],[79,-80,'Eastern woodland'],[-53,-99,'Stargazer Ridge'],[-43,16,'Wedding chapel'],[20,74,'South neighborhood'],[60,114,'Ocean'],[8,94,'Arrival dock']] as const) { if (townDetail || ['Willowbrook', 'Stargazer Ridge', 'Arrival dock', 'Ocean'].includes(label)) { ctx.fillStyle = '#d0d8df'; ctx.fillText(label,mx(x),mz(z)); } }
  for (const place of regionalLandmarks) {
    ctx.fillStyle = '#bdac90'; ctx.fillRect(mx(place.x)-5, mz(place.z)-5, 10, 10);
    ctx.fillText(place.name, mx(place.x), mz(place.z)-13);
  }
  for (const npc of npcCatalog) {
    if (!npc.missions.some(id => save.discovered.includes(id))) continue;
    const [x,,z] = world.npcPosition(npc.id); ctx.beginPath(); ctx.arc(mx(x), mz(z), 4, 0, Math.PI * 2); ctx.fillStyle = '#edb45c'; ctx.fill(); if (townDetail) ctx.fillText(npc.name, mx(x), mz(z) - 9);
  }
  for (const place of [galleryPlace, unclePlace, paperPlace, workshopPlace]) { ctx.fillStyle = '#c19bc6'; ctx.fillRect(mx(place.x)-4, mz(place.z)-4, 8, 8); if (townDetail) ctx.fillText(place.name, mx(place.x), mz(place.z)-10); }
  ctx.fillStyle = '#82c6d3'; ctx.fillRect(mx(cameraStore.x) - 4, mz(cameraStore.z) - 4, 8, 8); if (townDetail) ctx.fillText('Camera store', mx(cameraStore.x), mz(cameraStore.z) - 10);
  if (destination && walkRoute.length) {
    ctx.save(); ctx.strokeStyle = '#92c8b2'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(mx(player.x), mz(player.z));
    walkRoute.forEach(([x,z]) => ctx.lineTo(mx(x), mz(z))); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(mx(destination.point[0]), mz(destination.point[1]), 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const target = subjectPosition(world, frameMission()); ctx.beginPath(); ctx.arc(mx(target.x),mz(target.z),5,0,Math.PI * 2);ctx.fillStyle='#edb45c';ctx.fill();
  ctx.save(); ctx.translate(mx(player.x),mz(player.z));ctx.rotate(-yaw);
  ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,6);ctx.lineTo(0,3);ctx.lineTo(5,6);ctx.closePath();ctx.fillStyle='#92c8b2';ctx.fill();ctx.restore();
}
const landmarks = [
  ...regionalLandmarks.map(p => ({ id: p.id, name: p.name, x: p.entrance[0], z: p.entrance[1], target: [p.x, terrainHeight(p.x, p.z) + p.height * 0.47, p.z] })),
  { id: 'paper', name: paperPlace.name, x: paperPlace.entrance[0], z: paperPlace.entrance[1], target: [paperPlace.x, 1.7, paperPlace.z] },
  { id: 'boundary', name: boundaryPlace.name, x: boundaryPlace.entrance[0], z: boundaryPlace.entrance[1], target: [boundaryPlace.x, terrainHeight(boundaryPlace.x, boundaryPlace.z) + 1.6, boundaryPlace.z] },
  { id: 'workshop', name: workshopPlace.name, x: workshopPlace.entrance[0], z: workshopPlace.entrance[1], target: [44.2, 2.3, 84.8] },
  { id: 'gallery', name: galleryPlace.name, x: galleryPlace.entrance[0], z: galleryPlace.entrance[1], target: [galleryPlace.x, 2, galleryPlace.z] },
  { id: 'uncle', name: unclePlace.name, x: unclePlace.entrance[0], z: unclePlace.entrance[1], target: [unclePlace.x + 1, terrainHeight(unclePlace.x, unclePlace.z) + 1.6, unclePlace.z + 3] },
  { id: 'room', name: 'Your town room', x: 4, z: 56, target: [4, 2, 48] },
  { id: 'cottage', name: 'Garden cottage', x: 40, z: 65, target: [40, 2, 71] },
  { id: 'camera-store', name: cameraStore.name, x: cameraStore.entrance[0], z: cameraStore.entrance[1], target: [cameraStore.x, 2, cameraStore.z] },
  { id: 'chapel', name: 'Wedding chapel', x: -38, z: 35, target: [-43, 5, 16] },
  { id: 'streets', name: 'South neighborhood', x: 19, z: 32, target: [26, 1.3, 48] },
  { id: 'beach', name: 'Beach overlook', x: 57, z: 90, target: [60, 0.6, 110] },
];
function assignmentDestination(): Destination {
  const brief = frameMission(), shot = currentShot();
  return { id: `mission:${activeMission.id}:${shot?.id ?? ''}`, name: `${activeMission.title}${shot ? ` · ${shot.title}` : ''}`, point: [brief.viewpoint[0], brief.viewpoint[2]], hint: 'Viewpoint reached. Raise the camera and frame your subject.' };
}
function resolveDestination(id: string): Destination | undefined {
  if (id.startsWith('mission:')) {
    const [, missionId, shotId] = id.split(':');
    const m = missions.find(m => m.id === missionId);
    if (!m || !canAcceptMission(m, save.discovered, save.economy) || !storyMissionUnlocked(m.id, save.story, save.completed)) return;
    const shot = m.shots?.find(s => s.id === shotId);
    if (shotId && !shot) return;
    const brief = shotMission(m, shot);
    return { id, name: `${m.title}${shot ? ` · ${shot.title}` : ''}`, point: [brief.viewpoint[0], brief.viewpoint[2]], hint: 'Viewpoint reached. Raise the camera and frame your subject.' };
  }
  const place = landmarks.find(p => `place:${p.id}` === id);
  if (place) return { id, name: place.name, point: [place.x, place.z], hint: ['gallery', 'uncle', 'paper', 'workshop', 'camera-store', ...regionalLandmarks.map(p => p.id)].includes(place.id) ? 'You have arrived. Look for the R interaction prompt.' : 'You have arrived. Take a moment to explore.' };
}
function clearDirections() { destination = undefined; walkRoute = []; $('walking-guide').hidden = true; }
function guideTo(next: Destination | undefined) {
  if (!next) return;
  const route = walkingRoute([player.x, player.z], next.point, world.canWalk);
  if (!route.length) { toast('No clear walking route from here. Step into an open area and try again.'); return; }
  destination = next; walkRoute = route; lastRouteUpdate = 0;
  setCameraMode(false); modal.close(); persist(); updateDirections(performance.now());
  toast(`Walking to ${next.name}. Follow the direction cue; Explore shows the route.`);
}
function updateDirections(now: number) {
  const guide = $('walking-guide');
  guide.hidden = !destination || cameraMode || modal.open || !!meditation || openingStep !== null;
  if (!destination || modal.open || meditation || openingStep !== null) return;
  const here: WalkPoint = [player.x, player.z];
  if (now - lastRouteUpdate > 500) {
    lastRouteUpdate = now;
    if (Math.hypot(player.x - destination.point[0], player.z - destination.point[1]) < 2) {
      const hint = destination.hint; clearDirections(); persist(); toast(hint); return;
    }
    while (walkRoute.length > 1 && Math.hypot(player.x - walkRoute[0][0], player.z - walkRoute[0][1]) < 1.5) walkRoute.shift();
    // After a detour or a travel shortcut, rebuild from the actual player position.
    if (!walkRoute.length || !clearWalk(here, walkRoute[0], world.canWalk)) walkRoute = walkingRoute(here, destination.point, world.canWalk);
    for (let i = walkRoute.length - 1; i > 0; i--) {
      if (Math.hypot(player.x - walkRoute[i][0], player.z - walkRoute[i][1]) < 12 && clearWalk(here, walkRoute[i], world.canWalk)) { walkRoute = walkRoute.slice(i); break; }
    }
    $('walking-name').textContent = destination.name;
    $('walking-distance').textContent = walkRoute.length ? `${Math.ceil(routeDistance(here, walkRoute))} m on foot` : 'Step into an open area to reconnect';
  }
  $('walking-arrow').hidden = !walkRoute.length;
  if (!walkRoute.length) { $('walking-turn').textContent = 'Explore has other destinations.'; return; }
  const bearing = relativeBearing(here, walkRoute[0], yaw);
  $('walking-arrow').style.transform = `rotate(${bearing}rad)`;
  $('walking-turn').textContent = Math.abs(bearing) < 0.25 ? 'Continue ahead' : Math.abs(bearing) > 2.6 ? 'Turn around' : bearing > 0 ? 'Bear right' : 'Bear left';
}
function openMap(topLevel = false) {
  if (topLevel) pauseTab = 'explore';
  const known = missions.filter(m => save.discovered.includes(m.id) && missionGearReady(m, save.economy) && storyMissionUnlocked(m.id, save.story, save.completed));
  showModal('Beyond the town.', 'EXPLORE WILLOWBROOK', '520 m across · Four times the area. Follow the connected trails to Bracken Head Light, Northstar Observatory, Hollowstone Viaduct and Briar Hill Windmill. Arthur’s four horizons await beyond town. Green: you. Gold: current subject and locals you have met. Blue: camera store. Dashed green: your walking route.', `<div class="explore-tools"><span>${formatTime(clock.hour)} in Willowbrook</span><button class="secondary" id="map-detail">Town detail</button><button class="secondary" id="menu-meditate">${icon('moon')}Meditate</button><button class="secondary" id="menu-lighting">${icon('studio')}Lighting kit</button></div><canvas id="large-map" class="map-large" width="680" height="560"></canvas><p class="discovery-note">${save.walkingIntroduction ? 'Walk inland from the dock, then follow the western trail past the chapel into the meadow. Travel shortcuts unlock after your first deer photograph.' : 'Travel shortcuts appear for stories you have discovered. Explore on foot to meet new locals.'}</p><div class="map-route-summary">${destination ? `Walking to <strong>${esc(destination.name)}</strong> · ${Math.ceil(routeDistance([player.x, player.z], walkRoute))} m<button class="secondary" id="map-stop">Stop directions</button>` : 'Choose Walk to get directions without moving your position.'}</div><div class="map-legend">${landmarks.map(p => `<div class="map-destination"><span>${icon('pin')}${esc(p.name)}</span><button data-walk-landmark="${p.id}" aria-label="Walk to ${esc(p.name)}">Walk</button><button data-landmark="${p.id}" aria-label="Travel to ${esc(p.name)}" ${save.walkingIntroduction ? 'disabled' : ''}>Travel</button></div>`).join('')}${known.map(m => `<div class="map-destination"><span>${icon(categoryIcon[m.category])}${esc(m.title)}</span><button data-walk-place="${m.id}" aria-label="Walk to ${esc(m.title)}">Walk</button><button data-place="${m.id}" aria-label="Travel to ${esc(m.title)}" ${save.walkingIntroduction ? 'disabled' : ''}>Travel</button></div>`).join('')}</div>`, topLevel ? 'menu' : 'page');
  if ($('map-stop')) $('map-stop').onclick = () => { clearDirections(); persist(); openMap(topLevel); };
  modal.querySelectorAll<HTMLButtonElement>('[data-walk-landmark]').forEach(b => b.onclick = () => guideTo(resolveDestination(`place:${b.dataset.walkLandmark}`)));
  modal.querySelectorAll<HTMLButtonElement>('[data-walk-place]').forEach(b => b.onclick = () => { const m = missions.find(m => m.id === b.dataset.walkPlace)!; if (m.id === activeMission.id || selectMission(m)) guideTo(assignmentDestination()); });
  $('menu-meditate').onclick = openMeditation;
  $('menu-lighting').onclick = () => { modal.close(); if (!lightingOpen) toggleLightingKit(); };
  const canvas = $<HTMLCanvasElement>('large-map');
  let townDetail = false;
  drawMap(canvas);
  $('map-detail').onclick = () => { townDetail = !townDetail; $('map-detail').textContent = townDetail ? 'Whole region' : 'Town detail'; drawMap(canvas, townDetail); };
  modal.querySelectorAll<HTMLButtonElement>('[data-landmark]').forEach(button => button.onclick = () => {
    if (save.walkingIntroduction) return;
    const place = landmarks.find(p => p.id === button.dataset.landmark)!;
    requestTripod(false, true); player.set(place.x, world.groundHeight(place.x,place.z)+eyeHeight, place.z);
    const direction = new THREE.Vector3(...place.target).sub(player);
    yaw = Math.atan2(-direction.x, -direction.z); pitch = Math.atan2(direction.y, Math.hypot(direction.x,direction.z));
    focalLength=THREE.MathUtils.clamp(35,...focalRange(save.economy,equippedLens)); updateLensProjection();
    if (destination) walkRoute = walkingRoute([player.x, player.z], destination.point, world.canWalk);
    setCameraMode(false); modal.close(); toast(place.name);
  });
  modal.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b => b.onclick = () => { const m = missions.find(m => m.id === b.dataset.place)!; if (selectMission(m)) { travelTo(m); modal.close(); } });
}
function openHelp() {
  showModal('Controls & field guide.', 'HELP', 'Explore at your own pace. Return here whenever you need a hand.', `<div class="help-grid">
    <div class="help-card"><strong>Wander and frame</strong><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> move faster. <kbd>C</kbd> toggles a slow, quiet sneak and lowers your viewpoint; Shift stays quiet while sneaking.<br/>Drag the world to look around. On mobile, drag the thumb pad to walk and release to stop; drag the scene with another finger to look. The small sneak button slows your approach. Walking controls are hidden while the camera is raised. Arrow keys also aim. The starter lens is fixed at 35 mm. Buy a zoom or wildlife lens at the camera store, then choose it in the LENS dropdown to use the scroll wheel or <kbd>− / +</kbd>. <kbd>E</kbd> raises or lowers the camera with a quick animation. The camera button also raises or lowers the camera. Camera settings appear while it is raised; the focus panel appears in manual focus. Exploring uses a wide 24 mm view; the viewfinder and photographs use your selected lens.</div>
    <div class="help-card"><strong>Make a photograph</strong><kbd>1 / 2</kbd> slower / faster shutter.<br/><kbd>3 / 4</kbd> wider / narrower aperture.<br/><kbd>5 / 6</kbd> lower / higher ISO.<br/><kbd>Space</kbd> takes a photo. With the burst camera, <kbd>B</kbd> toggles three-frame bursts at 5 fps. <kbd>T</kbd> sets or packs the tripod in a quick animation. Walk again once it is packed.</div>
    <div class="help-card"><strong>Find your next story</strong><kbd>Esc</kbd> opens the pause menu: assignments, journal, gallery, map and field notes. Press it again to resume. Esc or the close button dismisses any message or submenu directly back to the game.<br/>Walk from the arrival dock to the western meadow for your first deer photograph. Approach with <kbd>C</kbd> to sneak: walking close or running will scare the deer. Step away and wait for it to settle if it bolts. Print the deer for free at the gallery and visit Arthur’s porch to begin the wedding commission. The lighthouse is an optional paid assignment. Approach a local and press <kbd>R</kbd> to talk. A small interaction prompt appears when you are close enough. Their available stories are added to your notebook as you complete main story milestones. Follow the trails into the hills and eastern wetland. Shortcuts become available for discovered assignments. Choose Walk to the viewpoint in Assignments, or Walk beside a place in Explore, for a walking route and a direction cue. The route saves with your notebook; use its × button to stop directions.</div>
    <div class="help-card"><strong>Learn from the frame</strong>A photo is assessed for composition, exposure, and the assignment's lesson. Some briefs require a set of distinct views. Choose each view in Assignments, then use Find the spot and Suggested settings. Move around the subject for a new perspective; repeated bursts and zoom changes do not fill another view. All required views must pass before the assignment pays. Accepted views survive reloads and the rolling journal. Click the brief thumbnail or open the journal to read feedback and try again. Slow shutters record moving subjects as streaks; fast shutters freeze them. A tripod steadies the scenery, while Panning follows the runner and streaks the background. Higher ISO is often the right choice when a moment moves fast.</div>
    <div class="help-card"><strong>Choose your depth of field</strong>The viewfinder previews focus. Autofocus follows an unobstructed assignment subject inside the frame; otherwise it focuses on the center surface. Press <kbd>M</kbd> to lock the current distance and enter manual focus. Use the focus slider or <kbd>[ / ]</kbd> to focus nearer or farther; <kbd>Q</kbd> focuses once without releasing the lock. Press M again for autofocus. The distance and focus mode save with your notebook, and the reticle turns amber when the subject is out of focus. A wider aperture, longer lens, or closer subject softens the foreground and background. Stop down to bring more depth into focus. Shutter motion appears in the saved photograph.</div>
    <div class="help-card"><strong>Shape the light</strong><kbd>L</kbd> opens the Lighting kit; <kbd>F</kbd> toggles purchased flash. Adjust manual flash power anywhere. Studio controls appear only near Daylight Studio, where you can move and tune key, fill, and rim lights. A brief flash favours close subjects; shutter speed controls the ambient within the 1/250 s sync limit.</div>
    <div class="help-card"><strong>Wait for the light</strong>The sun, clouds, exposure and stars change through a 30-minute day. Some assignments need a particular time. Open <kbd>Esc</kbd> → Explore → Meditate to skip ahead to dawn, daylight, golden hour, night or the assignment’s preferred time. Time pauses while menus are open.</div>
    <div class="help-card"><strong>A living town</strong>Locals walk familiar routes by day; Ida watches the ridge at night. The map follows the locals you have met. Residents and their dog wander the south neighborhood; cars slow the streets, ducks settle at dusk, deer graze in the meadow, and a fox emerges at night. Visit the wedding chapel or follow the southern path to the ocean. <kbd>Esc</kbd> → Settings controls sound and volume.</div>
    <div class="help-card"><strong>Your little collection</strong>Assignments pay once. Visit Willowbrook Camera Co. south of the track and press <kbd>R</kbd> at the door for a zoom lens, camera flash, or burst camera. Find the store in <kbd>Esc</kbd> → Explore. Buy ND16/ND32/ND64, CPL, or a soft graduated ND8 filter separately. The graduated filter darkens the top of the frame; its transition slider aligns the soft edge with your horizon. Only one filter is fitted at a time. The 200–600 mm wildlife lens unlocks bird close-ups. Switch owned lenses and filters directly from the camera bar; bird suggested settings also equip that lens.<br/>Progress and the latest 16 photographs save in this browser on this device. Download favourites from the darkroom. This prototype is designed for a desktop keyboard and mouse.</div>
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
    sneaking = false; eyeHeight = standingEyeHeight; $('sneak').setAttribute('aria-pressed', 'false'); $('sneak-label').textContent = 'Sneak';
    clearDirections(); save.openingSeen = false;
    save.story = freshStory(); world.storyPlaces.displayPrints([]);
    save.series = {}; save.activeShot = undefined; save.completed = []; save.discovered = ['intro-deer']; save.photos = []; equippedLens = 'prime'; save.economy = normalizeEconomy(undefined, []); focalLength = 35; activeMission = missions.find(m => m.id === 'intro-deer')!;
    settings = { shutter: 1 / 125, aperture: 5.6, iso: 100, filter: 'none', tripod: false, panning: false, flashPower: 0 }; studioRig = defaultStudioRig();
    focus.mode = 'auto'; focus.acquire(10);
    clock.skipTo(17); world.setTime(clock.hour); requestTripod(false, true); selectMission(activeMission); player.set(...activeMission.viewpoint); camera.fov = viewfinder.fov(focalLength, camera.aspect); camera.updateProjectionMatrix(); faceSubject(activeMission); syncSettings(); updateLensLabel(); modal.close();
    persist(); startOpening();
  };
}

function updateLensLabel() {
  const lensSelect = $<HTMLSelectElement>('lens');
  lensSelect.innerHTML = (['prime', 'zoom', 'telephoto'] as const).filter(lens => lens === 'prime' || ownsGear(save.economy, lens)).map(lens => `<option value="${lens}">${lens === 'prime' ? '35 mm' : lens === 'zoom' ? '24–120 mm' : '200–600 mm'}</option>`).join('');
  lensSelect.value = equippedLens;
  $('lens-label').textContent = String(Math.round(focalLength));
  $('lens-type').textContent = equippedLens === 'telephoto' ? 'WILDLIFE' : equippedLens === 'zoom' ? 'ZOOM' : 'PRIME';
}
function updateLensProjection() {
  camera.fov = viewfinder.fov(focalLength, camera.aspect); camera.updateProjectionMatrix(); updateLensLabel();
}
function equipLens(lens: LensId) {
  if (lens !== 'prime' && !ownsGear(save.economy, lens)) return;
  equippedLens = lens;
  focalLength = THREE.MathUtils.clamp(lens === 'telephoto' ? 200 : 35, ...focalRange(save.economy, lens));
  updateLensProjection();
}
function zoomCamera(delta: number) {
  if (equippedLens === 'prime') { gearHint('Choose an owned zoom or wildlife lens in the LENS dropdown. Buy new lenses at the camera store.'); return; }
  focalLength = zoomFocal(save.economy, focalLength, delta, equippedLens);
  updateLensProjection();
}

function paintTouchWalking() {
  walkPad.style.setProperty('--walk-x', `${touchWalk.offsetX}px`);
  walkPad.style.setProperty('--walk-y', `${touchWalk.offsetY}px`);
  walkPad.classList.toggle('held', touchWalk.pointerId !== null);
}
function resetTouchWalking() {
  const pointerId = touchWalk.pointerId;
  touchWalk.reset(); paintTouchWalking();
  if (pointerId !== null && walkPad.hasPointerCapture(pointerId)) walkPad.releasePointerCapture(pointerId);
}
function syncTouchWalking() {
  const available = touchLayout.matches && !cameraMode && !modal.open && openingStep === null && !meditation && !capturing && !tripod.movementLocked;
  stage.classList.toggle('touch-layout', touchLayout.matches);
  stage.classList.toggle('touch-walking', !!available);
  walkPad.hidden = !available;
  if (!available && touchWalk.pointerId !== null) resetTouchWalking();
}
function hasWalkingInput() {
  return ['w','a','s','d'].some(key => keys.has(key)) || Math.hypot(touchWalk.side, touchWalk.forward) > 0;
}
walkPad.addEventListener('pointerdown', e => {
  syncTouchWalking();
  if (walkPad.hidden || e.button !== 0 || !touchWalk.begin(e.pointerId)) return;
  e.preventDefault();
  const rect = walkPad.getBoundingClientRect();
  walkCenterX = rect.left + rect.width / 2; walkCenterY = rect.top + rect.height / 2;
  walkRadius = rect.width * 0.32;
  walkPad.setPointerCapture(e.pointerId);
  touchWalk.move(e.pointerId, e.clientX - walkCenterX, e.clientY - walkCenterY, walkRadius); paintTouchWalking();
});
walkPad.addEventListener('pointermove', e => {
  if (e.pointerId !== touchWalk.pointerId) return;
  e.preventDefault();
  touchWalk.move(e.pointerId, e.clientX - walkCenterX, e.clientY - walkCenterY, walkRadius); paintTouchWalking();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) walkPad.addEventListener(event, e => {
  if (e.pointerId === touchWalk.pointerId) resetTouchWalking();
});
touchLayout.addEventListener('change', () => { resetTouchWalking(); syncTouchWalking(); });
window.addEventListener('resize', resetTouchWalking);

for (const key of ['shutter', 'aperture', 'iso'] as const) $<HTMLSelectElement>(key).addEventListener('change', e => { settings[key] = Number((e.target as HTMLSelectElement).value); updateExposure(); });
$<HTMLSelectElement>('lens').addEventListener('change', e => { equipLens((e.target as HTMLSelectElement).value as LensId); updateFocus(); persist(); });
$<HTMLSelectElement>('filter').addEventListener('change', e => fitFilter((e.target as HTMLSelectElement).value as FilterId));
$<HTMLInputElement>('gradient-position').addEventListener('input', e => {
  settings.gradPosition = gradientPosition(Number((e.target as HTMLInputElement).value) / 100);
  $('gradient-value').textContent = `${Math.round(settings.gradPosition * 100)}%`;
  if (!cameraMode) setCameraMode(true); updateExposure(); persist();
});
$('tripod').onclick = () => requestTripod(tripod.target === 0);
$('panning').onclick = () => { settings.panning = !settings.panning; syncSettings(); };
$('capture').onclick = capture;
$('sneak').onclick = toggleSneak;
$('stop-directions').onclick = () => { clearDirections(); persist(); };
$('npc-prompt').onclick = talkToNPC;
$('lighting-kit').onclick = toggleLightingKit;
$('flash-toggle').onclick = () => { if (!ownsGear(save.economy, 'flash')) { openGearShop(); return; } settings.flashPower = flashPower(settings) > 0 ? 0 : 0.25; syncSettings(); if (lightingOpen) renderLightingPanel(); persist(); };
$('burst-mode').onclick = toggleBurst;
$('camera-mode').onclick = () => setCameraMode(!cameraMode);
$('focus-toggle').onclick = toggleFocus;
$('focus-mode').onclick = toggleFocus;
$('focus-acquire').onclick = acquireFocus;
$<HTMLInputElement>('focus-distance').addEventListener('input', e => {
  if (capturing || meditation || modal.open) return;
  focus.mode = 'manual'; focus.acquire(focusDistanceAt(Number((e.target as HTMLInputElement).value)));
  updateFocus();
});
$('focus-distance').addEventListener('change', persist);
$('menu-button').onclick = () => openPauseMenu();
$('help-button').onclick = openHelp;
modal.addEventListener('cancel', e => { e.preventDefault(); leaveModal(); });
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) leaveModal(); } });
modal.addEventListener('close', () => { if (!modal.open) { conversationSpeaker = undefined; modal.classList.remove('conversation-dialog', 'story-dialog'); stage.classList.remove('in-conversation'); } if (!modal.open && openingStep === null) audio.stopSpeaking(); keys.clear(); drag = false; renderer.domElement.focus({ preventScroll: true }); });
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (openingStep !== null) { if (key === 'escape') { e.preventDefault(); finishOpening(true); } return; }
  if (key === 'escape') { e.preventDefault(); if (meditation) { finishMeditation(); return; } if (!e.repeat) { if (modal.open) leaveModal(); else openPauseMenu(); } return; }
  if ((e.target as HTMLElement).matches('select,input,textarea') || modal.open || meditation) return;
  if (key === ' ' && (e.target as HTMLElement).closest('button,a,[contenteditable]')) return;
  if (capturing) { if (key === ' ') e.preventDefault(); if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(key); } return; }
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') { e.preventDefault(); adjustFocus(e.code === 'BracketLeft' ? -1 : 1); return; }
  if (['-', '=', '+'].includes(key)) { e.preventDefault(); zoomCamera(key === '-' ? 100 : -100); return; }
  const adjustment = adjustCameraSetting(settings, e.code.startsWith('Digit') ? e.code.slice(5) : key);
  if (adjustment) { e.preventDefault(); settings = adjustment.settings; syncSettings(); return; }
  if (['w', 'a', 's', 'd', 'shift', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) { e.preventDefault(); keys.add(key); }
  if (key === ' ') e.preventDefault();
  if (e.repeat) return;
  if (key === 'r') { e.preventDefault(); talkToNPC(); }
  if (key === 'c') { e.preventDefault(); toggleSneak(); }
  if (key === ' ') { e.preventDefault(); capture(); }
  if (key === 'e') { e.preventDefault(); setCameraMode(!cameraMode); }
  if (key === 'm') { e.preventDefault(); toggleFocus(); }
  if (key === 'q') { e.preventDefault(); acquireFocus(); }
  if (key === 't') { e.preventDefault(); $('tripod').click(); }
  if (key === 'b') { e.preventDefault(); toggleBurst(); }
  if (key === 'f') $('flash-toggle').click();
  if (key === 'l') toggleLightingKit();
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { resetTouchWalking(); keys.clear(); drag = false; audio.silence(); });
document.addEventListener('visibilitychange', () => { resetTouchWalking(); keys.clear(); drag = false; previousTime = performance.now(); if (document.hidden) { audio.silence(); if (capturing) finishShooting(); persist(); } });
window.addEventListener('pagehide', () => { resetTouchWalking(); audio.silence(); if (capturing) finishShooting(); persist(); });
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0 || drag || modal.open || tripod.transitioning || meditation || openingStep !== null) return;
  lookPointerId = e.pointerId; drag = true; lastPointerX = e.clientX; lastPointerY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== lookPointerId || modal.open || tripod.transitioning || meditation || openingStep !== null) return;
  const sensitivity = (cameraMode ? Math.min(1, 35 / focalLength) : 1);
  yaw -= (e.clientX - lastPointerX) * 0.004 * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastPointerY) * 0.003 * sensitivity, -1.3, 1.3);
  lastPointerX = e.clientX; lastPointerY = e.clientY;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) renderer.domElement.addEventListener(event, e => {
  if (e.pointerId === lookPointerId) { drag = false; lookPointerId = null; }
});
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault(); if (modal.open || capturing || meditation || openingStep !== null) return;
  zoomCamera(e.deltaY);
}, { passive: false });
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); keys.clear(); toast('Graphics were interrupted. Reload to return to your saved journal.'); });

world.storyPlaces.displayPrints(save.story.prints);
world.storyPlaces.setReportPublished(save.story.reportPublished, save.story.workshopShared);
world.harbor.setShared(save.story.workshopShared);
world.setTime(clock.hour); applyStudioRig(); world.update(0, settings); world.scene.updateMatrixWorld(true);
$('shot-guide').onclick = () => { missionSection='active'; openPauseMenu('assignments'); };
faceSubject(activeMission); syncSettings(); updateProgress(); resize(); updateLensLabel();
renderer.shadowMap.needsUpdate = true;
if (activeMission.id === 'intro-deer') { settings = { ...activeMission.recommended, flashPower: 0 }; syncSettings(); if (!save.position) { yaw = 0; pitch = 0; } }
if (save.destination) { destination = resolveDestination(save.destination); if (destination) walkRoute = walkingRoute([player.x, player.z], destination.point, world.canWalk); }
if (save.openingSeen === false) startOpening();
let previousTime = performance.now(), lastMeterTime = 0;
function animate(now: number) {
  syncTouchWalking();
  const realDt = document.hidden ? 0 : Math.max(0, (now - previousTime) / 1000);
  const dt = Math.min(realDt, 0.05); previousTime = now;
  if (openingStep !== null) {
    if (!document.hidden && document.hasFocus()) openingSeconds += realDt;
    world.update(elapsed + openingSeconds, settings);
    if (openingStep === 0) {
      const progress = reducedMotion.matches ? 1 : Math.min(1, openingSeconds / ARRIVAL_DURATION);
      $<HTMLButtonElement>('opening-next').disabled = progress < 1;
      $('arrival-progress').style.width = `${progress * 100}%`;
      const beat = openingSeconds < 11 ? 0 : openingSeconds < 23 ? 1 : 2;
      const caption = $('opening-overlay');
      if (caption.dataset.beat !== String(beat)) {
        caption.dataset.beat = String(beat);
        const lines = [openingScenes[0],
          { title: 'Three flashes, then home.', speaker: 'Arthur · From the same letter', line: 'Your mother used to count Bracken Head’s light from the ferry. I still look for it from the porch. Some things carry on while we’re away.' },
          { title: 'There’s still time to sit together.', speaker: 'Arthur · A chair waiting on the porch', line: 'The observatory. The old railway arches. The mill on Briar Hill. I wish I could take you round them again. Come tell me how they look now. Mostly, I’d love to see you.' }];
        if (beat > 0) audio.speak('arthur', lines[beat].line);
        $('arrival-title').textContent = lines[beat].title; $('arrival-speaker').textContent = lines[beat].speaker; $('arrival-line').textContent = `“${lines[beat].line}”`;
      }
    }
  } else if (meditation) {
    meditation.elapsed += realDt;
    const progress = Math.min(1, meditation.elapsed / 1.5);
    const travelled = meditation.distance * (progress * progress * (3 - 2 * progress));
    advanceWorldTime(travelled - meditation.travelled); meditation.travelled = travelled;
    world.setTime(clock.hour); $('meditation-time').textContent = formatTime(clock.hour);
    if (progress === 1) { clock.skipTo(meditation.target); finishMeditation(); }
  } else if (!modal.open) {
    elapsed += dt; advanceWorldTime(realDt * 24 / DAY_SECONDS); world.setTime(clock.hour);
    // Keep one stance height for exploration, framing, flash and saved photographs.
    // Freeze it during a capture so exposure samples cannot move the camera vertically.
    if (!capturing) {
      const targetHeight = sneaking ? sneakingEyeHeight : standingEyeHeight;
      eyeHeight = reducedMotion.matches ? targetHeight : THREE.MathUtils.damp(eyeHeight, targetHeight, 12, dt);
      if (Math.abs(eyeHeight - targetHeight) < 0.001) eyeHeight = targetHeight;
    }
    const viewfinderWasTransitioning = viewfinder.transitioning;
    viewfinder.update(dt); camera.fov = viewfinder.fov(focalLength, camera.aspect); camera.updateProjectionMatrix();
    stage.style.setProperty('--viewfinder-progress', String(viewfinder.progress));
    if (viewfinderWasTransitioning && !viewfinder.transitioning) syncTripod();
    const wasTransitioning = tripod.transitioning;
    tripod.update(dt);
    if (wasTransitioning) {
      settings.tripod = tripod.deployed; syncTripod();
      if (!tripod.transitioning) tripodSettle = tripod.deployed ? 0.18 : 0;
    } else tripodSettle = Math.max(0, tripodSettle - dt);
    const aimStep = dt * (cameraMode ? Math.min(1, 35 / focalLength) : 1);
    if (!tripod.transitioning && keys.has('arrowleft')) yaw += aimStep; if (!tripod.transitioning && keys.has('arrowright')) yaw -= aimStep;
    if (!tripod.transitioning && keys.has('arrowup')) pitch = Math.min(1.3, pitch + aimStep * 0.7); if (!tripod.transitioning && keys.has('arrowdown')) pitch = Math.max(-1.3, pitch - aimStep * 0.7);
    if (!tripod.movementLocked && !capturing) {
      const forward = Number(keys.has('w')) - Number(keys.has('s')) + touchWalk.forward, side = Number(keys.has('d')) - Number(keys.has('a')) + touchWalk.side;
      const length = Math.max(1, Math.hypot(forward, side)), speed = movementSpeed(sneaking, keys.has('shift')) * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / length * speed;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / length * speed;
      if (world.canWalk(player.x + dx, player.z)) player.x += dx;
      if (world.canWalk(player.x, player.z + dz)) player.z += dz;
    }
    const moving = !tripod.movementLocked && !capturing && hasWalkingInput();
    world.reactWildlife(elapsed, { x: player.x, z: player.z, moving, sneaking, running: !sneaking && keys.has('shift') });
    world.update(elapsed, settings);
  }
  const walking = !modal.open && !meditation && !tripod.movementLocked && !capturing && hasWalkingInput();
  audio.update(clock.hour, player, yaw, world.traffic, !modal.open && !meditation && !document.hidden && document.hasFocus(), walking, !sneaking && keys.has('shift'), sneaking);
  if (openingStep !== null) world.opening.update(camera, openingStep, openingSeconds, reducedMotion.matches);
  else updateCamera();
  syncLightingAvailability(); updateNPCPrompt(); updateDirections(now); world.scene.updateMatrixWorld(true);
  if (capturing && !modal.open && !meditation) captureFrame(now);
  if (shootReadyAt && now >= shootReadyAt) { shootReadyAt = 0; syncTripod(); }
  applyCameraLight(settings);
  if (now - lastMeterTime > 150) {
    updateExposure(); if (cameraMode) updateFocus(); renderer.shadowMap.needsUpdate = true; lastMeterTime = now;
  }
  if (conversationSpeaker && modal.open) {
    const { width, height } = stage.getBoundingClientRect();
    const frame = `${width}-${height}`;
    if (frame !== conversationFrame) {
      world.scene.updateMatrixWorld(true);
      frameConversation(conversationCamera, conversationSpeaker, width, height, world.solids);
      conversationFrame = frame;
    }
    renderer.render(world.scene, conversationCamera);
  } else if (cameraMode && openingStep === null) viewfinderRenderer.render(renderer, world.scene, camera, { aperture: settings.aperture, focalLength, focusDistance, filter: settings.filter, gradPosition: settings.gradPosition });
  else renderer.render(world.scene, camera);
  if (!conversationSpeaker && !reducedMotion.matches && viewfinder.transitioning && openingStep === null) {
    cameraView.update(viewfinder.progress, camera.aspect);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(cameraView.scene, cameraView.camera); renderer.autoClear = true;
  }
  if (!conversationSpeaker && !reducedMotion.matches && (tripod.transitioning || tripodSettle > 0)) {
    tripodView.update(tripod.progress, tripod.transitioning ? 1 : tripodSettle / 0.18, camera.aspect);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(tripodView.scene, tripodView.camera); renderer.autoClear = true;
  }
  if (!modal.open && openingStep === null && now - lastClockSave > 60000) { persist(); lastClockSave = now; }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

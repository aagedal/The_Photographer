// Development-only GPU regression checks. Vite serves this page directly;
// it is not included in the production build and never uses the player save.
import * as THREE from 'three';
import { createPhotoRenderer } from '../src/photo-renderer.ts';
import { createViewfinderRenderer } from '../src/depth-of-field.ts';
import { exposureSamples } from '../src/motion.ts';
import { missions } from '../src/missions.ts';
import { createWorld, subjectPosition } from '../src/world.ts';
import { fovForFocal } from '../src/economy.ts';
import { createCelestialDisc, createSkyDome } from '../src/sky-dome.ts';
import { sampleSky, CELESTIAL_DISTANCE } from '../src/environment.ts';
import { WORLD_HALF } from '../src/terrain.ts';

const results = document.querySelector<HTMLPreElement>('#results')!;
const images = document.querySelector<HTMLElement>('#images')!;
function show(label: string, canvas: HTMLCanvasElement, container = images) {
  const figure = document.createElement('figure'), caption = document.createElement('figcaption');
  caption.textContent = label; figure.append(canvas, caption); container.append(figure);
}
function difference(a: HTMLCanvasElement, b: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const ap = a.getContext('2d')!.getImageData(x, y, w, h).data;
  const bp = b.getContext('2d')!.getImageData(x, y, w, h).data;
  let sum = 0; for (let i = 0; i < ap.length; i += 4) for (let c = 0; c < 3; c++) sum += Math.abs(ap[i + c] - bp[i + c]);
  return sum / (w * h * 3);
}
function contrast(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const p = canvas.getContext('2d')!.getImageData(x, y, w, h).data;
  let sum = 0; for (let row = 0; row < h; row++) for (let col = 1; col < w; col++) {
    const i = (row * w + col) * 4;
    sum += Math.abs(p[i] - p[i - 4]);
  }
  return sum / ((w - 1) * h);
}
function brightness(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const p = canvas.getContext('2d')!.getImageData(x, y, w, h).data;
  let sum = 0; for (let i = 0; i < p.length; i += 4) sum += (p[i] + p[i + 1] + p[i + 2]) / 3;
  return sum / (w * h);
}

document.querySelector<HTMLButtonElement>('#run')!.onclick = () => {
  images.replaceChildren(); results.textContent = 'Rendering…';
  const checks: string[] = [];
  const check = (condition: boolean, text: string) => { checks.push(`${condition ? 'PASS' : 'FAIL'} ${text}`); };
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(900, 600); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const capture = createPhotoRenderer(), preview = createViewfinderRenderer();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#101010');
  const camera = new THREE.PerspectiveCamera(fovForFocal(120, 1.5), 1.5, 0.1, 450);
  for (let x = -16; x < 16; x++) for (let y = -12; y < 12; y++) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: (x + y) % 2 === 0 ? '#fafafa' : '#242424' }));
    tile.position.set(x * 0.1, y * 0.1, -8); scene.add(tile);
  }
  const subject = new THREE.Group(); subject.position.set(0, 0, -3); scene.add(subject);
  subject.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.1), new THREE.MeshBasicMaterial({ color: '#75db91' })));
  for (let x = 0; x < 10; x++) for (let y = 0; y < 16; y++) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), new THREE.MeshBasicMaterial({ color: (x + y) % 2 === 0 ? '#75db91' : '#205337' }));
    tile.position.set((x - 4.5) * 0.022, (y - 7.5) * 0.022, 0.051); subject.add(tile);
  }
  const optics = { aperture: 1.8, focalLength: 120, focusDistance: 2.95 };
  const photo = (aperture: number) => capture.render(renderer, 1, camera, { ...optics, aperture }, () => renderer.render(scene, camera));
  const wide = photo(1.8), narrow = photo(16);
  show('120 mm · f/1.8 · focus 2.95 m', wide); show('120 mm · f/16 · same focus and exposure', narrow);
  const wideContrast = contrast(wide, 620, 120, 200, 360), narrowContrast = contrast(narrow, 620, 120, 200, 360);
  check(wideContrast < narrowContrast * 0.5, `Stopping down restores background detail (${wideContrast.toFixed(2)} → ${narrowContrast.toFixed(2)})`);
  const focusDifference = difference(wide, narrow, 370, 150, 160, 300);
  check(focusDifference < 1, `Focused subject stays sharp (${focusDifference.toFixed(3)} mean pixel difference)`);
  preview.render(renderer, scene, camera, optics);
  const live = document.createElement('canvas'); live.width = 900; live.height = 600;
  live.getContext('2d')!.drawImage(renderer.domElement, 0, 0); show('Live viewfinder · f/1.8', live);
  const previewDifference = difference(wide, live, 0, 0, 900, 600);
  check(previewDifference < 1, `Live preview matches saved photograph (${previewDifference.toFixed(3)} mean pixel difference)`);
  const backgroundFocus = capture.render(renderer, 1, camera, { ...optics, focusDistance: 8 }, () => renderer.render(scene, camera));
  const sharpSubject = contrast(wide, 370, 150, 160, 300), softSubject = contrast(backgroundFocus, 370, 150, 160, 300);
  check(softSubject < sharpSubject * 0.5 && contrast(backgroundFocus, 620, 120, 200, 360) > narrowContrast,
    `Changing focus sharpens the background and blurs the foreground (${sharpSubject.toFixed(2)} → ${softSubject.toFixed(2)} foreground detail)`);
  const combinedSamples = exposureSamples(0.5);
  const combined = capture.render(renderer, combinedSamples.length, camera, optics, i => {
    subject.position.x = combinedSamples[i] * 0.4; renderer.render(scene, camera);
  });
  subject.position.x = 0;
  check(difference(wide, combined, 300, 100, 300, 400) > 5 && contrast(combined, 620, 120, 200, 360) < narrowContrast * 0.5,
    'Motion blur and depth of field coexist in the same exposure');

  // Portrait viewports include more vertical scenery, but their centered
  // sensor crop must have the same optics as a scaled saved photograph.
  renderer.setSize(450, 900); camera.aspect = 0.5; camera.fov = fovForFocal(120, 0.5); camera.updateProjectionMatrix();
  preview.render(renderer, scene, camera, optics);
  const portraitCrop = document.createElement('canvas'); portraitCrop.width = 450; portraitCrop.height = 300;
  portraitCrop.getContext('2d')!.drawImage(renderer.domElement, 0, 300, 450, 300, 0, 0, 450, 300);
  const scaledPhoto = document.createElement('canvas'); scaledPhoto.width = 450; scaledPhoto.height = 300;
  scaledPhoto.getContext('2d')!.drawImage(wide, 0, 0, 450, 300);
  const cropDifference = difference(scaledPhoto, portraitCrop, 0, 0, 450, 300);
  check(cropDifference < 3, `Portrait viewport crop preserves optics after resize (${cropDifference.toFixed(3)} mean pixel difference)`);
  renderer.setSize(900, 600); camera.aspect = 1.5; camera.updateProjectionMatrix();
  camera.fov = fovForFocal(120, 1.5); camera.updateProjectionMatrix();
  const graduatedOptics = { ...optics, filter: 'gnd3' as const, gradPosition: 0.5 };
  const graduated = capture.render(renderer, 1, camera, graduatedOptics, () => renderer.render(scene, camera));
  show('Graduated ND8 · three-stop top, clear bottom', graduated);
  const topLoss = brightness(wide, 620, 40, 180, 80) - brightness(graduated, 620, 40, 180, 80);
  check(topLoss > 40 && difference(wide, graduated, 620, 460, 180, 80) === 0,
    `Graduated ND darkens only the top (${topLoss.toFixed(2)} brightness reduction; bottom unchanged)`);
  const shifted = capture.render(renderer, 1, camera, { ...graduatedOptics, gradPosition: 0.8 }, () => renderer.render(scene, camera));
  check(brightness(shifted, 620, 290, 180, 20) < brightness(graduated, 620, 290, 180, 20) - 20, 'Moving the graduated transition changes the middle exposure');
  preview.render(renderer, scene, camera, graduatedOptics);
  const liveGraduated = document.createElement('canvas'); liveGraduated.width = 900; liveGraduated.height = 600;
  liveGraduated.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  check(difference(liveGraduated, graduated, 0, 0, 900, 600) < 1, 'Graduated ND live preview matches capture');
  renderer.setSize(450, 900); camera.aspect = 0.5; camera.fov = fovForFocal(120, 0.5); camera.updateProjectionMatrix();
  preview.render(renderer, scene, camera, graduatedOptics);
  portraitCrop.getContext('2d')!.drawImage(renderer.domElement, 0, 300, 450, 300, 0, 0, 450, 300);
  scaledPhoto.getContext('2d')!.drawImage(graduated, 0, 0, 450, 300);
  check(difference(scaledPhoto, portraitCrop, 0, 0, 450, 300) < 3, 'Graduated transition matches the saved crop in a portrait viewport');
  renderer.setSize(900, 600); camera.aspect = 1.5; camera.updateProjectionMatrix();

  // Validate motion with the actual animated game world, including tracking.
  const world = createWorld(); const mission = missions.find(m => m.id === 'sports-2')!;
  const settings = { ...mission.recommended, tripod: true, focalLength: 35, flashPower: 0 };
  const time = 2;
  camera.fov = fovForFocal(35, 1.5); camera.updateProjectionMatrix(); camera.position.set(...mission.viewpoint);
  world.update(time, settings); world.setTime(14); world.scene.updateMatrixWorld(true); camera.lookAt(subjectPosition(world, mission)); camera.updateMatrixWorld(true);
  const rotation = camera.quaternion.clone();
  const focus = -subjectPosition(world, mission).applyMatrix4(camera.matrixWorldInverse).z;
  const motion = (shutter: number, pan: boolean) => {
    const samples = exposureSamples(shutter);
    return capture.render(renderer, samples.length, camera, { aperture: 8, focalLength: 35, focusDistance: focus }, i => {
      world.update(time + samples[i], settings); world.scene.updateMatrixWorld(true); camera.quaternion.copy(rotation);
      if (pan) camera.lookAt(subjectPosition(world, mission));
      camera.updateMatrixWorld(true); renderer.render(world.scene, camera);
    });
  };
  const fast = motion(1 / 1000, false), slow = motion(0.5, false), pan = motion(0.5, true);
  show('Runner · 1/1000 s · tripod', fast); show('Runner · 0.5 s · tripod', slow); show('Runner · 0.5 s · panning', pan);
  const subjectMotion = difference(fast, slow, 400, 225, 100, 160), fixedScenery = difference(fast, slow, 650, 150, 150, 300);
  check(subjectMotion > 2, `Slow shutter records runner motion (${subjectMotion.toFixed(2)} pixel difference)`);
  check(fixedScenery < 0.5, `Tripod keeps static scenery sharp (${fixedScenery.toFixed(3)} pixel difference)`);
  const backgroundPan = difference(fast, pan, 650, 150, 150, 300);
  check(backgroundPan > 2, `Panning streaks the scenery (${backgroundPan.toFixed(2)} pixel difference)`);
  world.update(time, settings); camera.quaternion.copy(rotation); camera.updateMatrixWorld(true);
  const restored = motion(1 / 1000, false);
  check(difference(fast, restored, 0, 0, 900, 600) === 0, 'Sampling restores the original rendered frame');
  const bakerMission = missions.find(m => m.id === 'news-1')!;
  camera.position.set(...bakerMission.viewpoint); camera.lookAt(subjectPosition(world, bakerMission)); camera.updateMatrixWorld(true);
  world.setTime(7);
  const windowPhoto = (filter: 'none' | 'cpl') => capture.render(renderer, 1, camera, { aperture: 4, focalLength: 35, focusDistance: 9.6 }, () => {
    world.update(time, { ...settings, filter }); renderer.render(world.scene, camera);
  });
  const reflective = windowPhoto('none'), polarized = windowPhoto('cpl');
  const reflectionComparison = document.createElement('section'); reflectionComparison.id = 'window-comparison';
  reflectionComparison.style.width = '100%'; images.append(reflectionComparison);
  show('Bakery window · no polarizer · matched exposure', reflective, reflectionComparison); show('Bakery window · CPL · matched exposure', polarized, reflectionComparison);
  const reflectionDifference = difference(reflective, polarized, 240, 100, 420, 400);
  check(reflectionDifference > 5, `CPL visibly suppresses reflected scenery (${reflectionDifference.toFixed(2)} mean pixel difference)`);
  // The shallow lake has real underwater fish; compare at matched exposure.
  world.setTime(14); camera.position.set(0, 2.3, 6); camera.lookAt(-4.7, -0.4, 4.5); camera.updateMatrixWorld(true);
  const waterOptics = { aperture: 8, focalLength: 35, focusDistance: 5.6 };
  const lakePhoto = (filter: 'none' | 'cpl', t = 2) => capture.render(renderer, 1, camera, waterOptics, () => {
    world.update(t, { ...settings, filter }); renderer.render(world.scene, camera);
  });
  const lakeGlare = lakePhoto('none'), lakeClear = lakePhoto('cpl');
  const waterComparison = document.createElement('section'); waterComparison.id = 'water-comparison'; waterComparison.style.width = '100%'; images.append(waterComparison);
  show('Lake surface · reflected trees and ripples · no CPL', lakeGlare, waterComparison);
  show('Lake surface · CPL reveals fish · matched exposure', lakeClear, waterComparison);
  const waterDifference = difference(lakeGlare, lakeClear, 120, 80, 660, 440);
  check(waterDifference > 2, `CPL reduces water glare (${waterDifference.toFixed(2)} mean pixel difference)`);
  const fishGroups = ['jetty-fish', 'lake-fish', 'east-lake-fish', 'wetland-fish'].map(name => world.scene.getObjectByName(name)!);
  fishGroups.forEach(group => { group.visible = false; }); const emptyLake = lakePhoto('cpl'); fishGroups.forEach(group => { group.visible = true; });
  const fishDifference = difference(lakeClear, emptyLake, 200, 180, 500, 300);
  check(fishDifference > 0.15, `Underwater fish are visible through the surface (${fishDifference.toFixed(2)} mean pixel difference)`);
  const laterFish = lakePhoto('cpl', 6);
  check(difference(lakeClear, laterFish, 200, 180, 500, 300) > 0.5, 'Fish swim and water ripples animate');
  const fishSamples = exposureSamples(1);
  const swimmingExposure = capture.render(renderer, fishSamples.length, camera, waterOptics, i => {
    world.update(2 + fishSamples[i], { ...settings, filter: 'cpl' }); renderer.render(world.scene, camera);
  });
  check(difference(lakeClear, swimmingExposure, 200, 180, 500, 300) > 0.25, 'A long exposure records swimming motion beneath the water');
  const lakeRestored = lakePhoto('cpl');
  check(difference(lakeClear, lakeRestored, 0, 0, 900, 600) === 0, 'Fish and water restore exactly after temporal sampling');
  preview.render(renderer, world.scene, camera, waterOptics);
  const lakePreview = document.createElement('canvas'); lakePreview.width = 900; lakePreview.height = 600;
  lakePreview.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  check(difference(lakeClear, lakePreview, 0, 0, 900, 600) < 1, 'Reflective water and fish match between preview and saved photograph');
  const creekMission = missions.find(m => m.id === 'nature-2')!;
  camera.position.set(...creekMission.viewpoint); camera.lookAt(subjectPosition(world, creekMission)); camera.updateMatrixWorld(true);
  const creekOptics = { aperture: 8, focalLength: 35, focusDistance: -subjectPosition(world, creekMission).applyMatrix4(camera.matrixWorldInverse).z };
  const waterfallPhoto = (shutter: number) => {
    const samples = exposureSamples(shutter);
    return capture.render(renderer, samples.length, camera, creekOptics, i => {
      world.update(2 + samples[i], { ...settings, filter: 'none' }); renderer.render(world.scene, camera);
    });
  };
  const waterfallFast = waterfallPhoto(1 / 1000), waterfallSlow = waterfallPhoto(0.5);
  const waterfallComparison = document.createElement('section'); waterfallComparison.id = 'waterfall-comparison'; waterfallComparison.style.width = '100%'; images.append(waterfallComparison);
  show('Fern Creek · 1/1000 s · cliff, plunge pool and river', waterfallFast, waterfallComparison);
  show('Fern Creek · 0.5 s · matched exposure · softened whitewater', waterfallSlow, waterfallComparison);
  const waterfallMotion = difference(waterfallFast, waterfallSlow, 350, 100, 200, 400);
  check(waterfallMotion > 0.3, `Slow shutter softens falling water and spray (${waterfallMotion.toFixed(2)} mean pixel difference)`);
  check(difference(waterfallFast, waterfallSlow, 100, 180, 100, 180) < 0.5, 'Waterfall cliff stays sharp during a tripod exposure');
  const waterfallRestored = waterfallPhoto(1 / 1000);
  check(difference(waterfallFast, waterfallRestored, 0, 0, 900, 600) === 0, 'Waterfall, spray and river restore after temporal sampling');
  preview.render(renderer, world.scene, camera, creekOptics);
  const waterfallPreview = document.createElement('canvas'); waterfallPreview.width = 900; waterfallPreview.height = 600;
  waterfallPreview.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  check(difference(waterfallFast, waterfallPreview, 0, 0, 900, 600) < 1, 'Expanded waterfall matches between viewfinder and saved photograph');
  // A celestial source must retain its screen position and size as the player
  // crosses the enlarged map, even with a far plane closer than the source.
  const skyScene=new THREE.Scene(), skyDome=createSkyDome(skyScene);
  const celestialSun=createCelestialDisc('test-sun','#ffe4ad',CELESTIAL_DISTANCE*Math.tan(THREE.MathUtils.degToRad(0.5)));
  const celestialMoon=createCelestialDisc('test-moon','#d1dcec',CELESTIAL_DISTANCE*Math.tan(THREE.MathUtils.degToRad(0.4)));
  skyScene.add(celestialSun,celestialMoon);
  const skyFrame=(position:THREE.Vector3,direction:THREE.Vector3,far:number)=>{
    camera.position.copy(position);camera.far=far;camera.fov=fovForFocal(35,1.5);camera.updateProjectionMatrix();
    camera.lookAt(position.clone().add(direction));camera.updateMatrixWorld(true);renderer.render(skyScene,camera);
    const frame=document.createElement('canvas');frame.width=900;frame.height=600;frame.getContext('2d')!.drawImage(renderer.domElement,0,0);return frame;
  };
  let largestSkyDifference=0,lowestSunBrightness=255;
  for(const hour of [6.5,12,17]){
    const environment=sampleSky(hour),direction=new THREE.Vector3(...environment.sunPosition).normalize();
    celestialSun.position.set(...environment.sunPosition);celestialMoon.visible=false;
    skyDome.setTime(environment.daylight,environment.warmth,new THREE.Color('#bcd8d2'),environment.sunPosition);
    const reference=skyFrame(new THREE.Vector3(0,1.7,0),direction,900);
    lowestSunBrightness=Math.min(lowestSunBrightness,brightness(reference,446,296,8,8));
    for(const x of [-WORLD_HALF+4,WORLD_HALF-4])for(const z of [-WORLD_HALF+4,WORLD_HALF-4]){
      const distant=skyFrame(new THREE.Vector3(x,35,z),direction,60);
      largestSkyDifference=Math.max(largestSkyDifference,difference(reference,distant,0,0,900,600));
    }
  }
  check(lowestSunBrightness>200,`Sun remains visible beyond the camera far plane (${lowestSunBrightness.toFixed(2)} center brightness)`);
  check(largestSkyDifference<0.1,`Sun and sky retain their angular position and size across the entire map (${largestSkyDifference.toFixed(3)} pixel difference)`);
  const midnight=sampleSky(0),moonDirection=new THREE.Vector3(...midnight.sunPosition).negate().normalize();
  celestialSun.visible=false;celestialMoon.visible=true;celestialMoon.position.set(...midnight.sunPosition).negate();
  skyDome.setTime(0,0,new THREE.Color('#111d30'),midnight.sunPosition);
  const moonCentre=skyFrame(new THREE.Vector3(0,1.7,0),moonDirection,900),moonEdge=skyFrame(new THREE.Vector3(WORLD_HALF-4,35,-WORLD_HALF+4),moonDirection,60);
  check(brightness(moonEdge,446,296,8,8)>200&&difference(moonCentre,moonEdge,0,0,900,600)<0.1,'Moon also stays in the distant sky while walking and changing far planes');
  show('Distant moon · viewed from the map edge',moonEdge);
  camera.far=450;camera.updateProjectionMatrix();
  const previousTarget = new THREE.WebGLRenderTarget(16, 16);
  renderer.setRenderTarget(previousTarget); renderer.autoClear = false;
  try { capture.render(renderer, 1, camera, optics, () => { throw new Error('Deliberate sample failure'); }); } catch { /* expected */ }
  check(renderer.getRenderTarget() === previousTarget && !renderer.autoClear, 'A failed capture restores renderer state');
  renderer.setRenderTarget(null); renderer.autoClear = true; previousTarget.dispose();
  results.textContent = checks.join('\n');
  capture.dispose(); preview.dispose(); renderer.dispose();
};

document.querySelector<HTMLButtonElement>('#notebook')!.onclick = () => {
  localStorage.setItem('the-photographer-playtest-rendering-checks-v1', JSON.stringify({
    version: 1, discovered: missions.map(m => m.id), completed: [], photos: [], active: 'wedding-1', hour: 14,
    lens: 'zoom', focalLength: 120, economy: { purchased: [], gifted: ['zoom', 'flash', 'burst', 'telephoto'], burstEnabled: false },
  }));
  results.textContent = 'Prepared only the rendering-checks notebook. Player progress is unchanged. Open the isolated game link.';
};
document.querySelector<HTMLButtonElement>('#filter-notebook')!.onclick = () => {
  localStorage.setItem('the-photographer-playtest-filter-checks-v1', JSON.stringify({
    version: 1, filterShopVersion: 1, discovered: missions.map(m => m.id), completed: ['nature-1', 'sports-1', 'sports-2'],
    photos: [], active: 'nature-2', hour: 14, lens: 'prime', focalLength: 35,
    economy: { purchased: [], gifted: [], burstEnabled: false },
  }));
  results.textContent = 'Prepared only the filter-checks notebook: $460 in rewards, no owned filters, all stories discovered.';
};
document.querySelector<HTMLButtonElement>('#creek-notebook')!.onclick = () => {
  localStorage.setItem('the-photographer-playtest-creek-checks-v1', JSON.stringify({
    version: 1, filterShopVersion: 1, discovered: missions.map(m => m.id), completed: [], photos: [], active: 'nature-2', hour: 14,
    lens: 'prime', focalLength: 35, filter: 'nd6', economy: { purchased: [], gifted: ['nd6', 'cpl'], burstEnabled: false },
  }));
  results.textContent = 'Prepared only the creek-checks notebook, with ND64 and CPL for waterfall playtesting.';
};

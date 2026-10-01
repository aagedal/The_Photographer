import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainHeight } from './terrain.ts';
import { createIdleRig, animateIdle } from './character-idle.ts';

import { galleryPlace, unclePlace } from './world-layout.ts';
export { galleryPlace, unclePlace } from './world-layout.ts';
export const paperPlace = { name: 'The Willowbrook Paper', x: 26, z: -2, entrance: [26, 1] as const };
export const boundaryPlace = { name: 'Northern footpath boundary', x: -40, z: -45, entrance: [-34, -37] as const };
export function nearStoryPlace(place: { entrance: readonly [number, number] }, x: number, y: number, z: number) {
  const [px, pz] = place.entrance;
  return Math.hypot(x - px, y - terrainHeight(px, pz) - 1.7, z - pz) < 4;
}
export function createStoryPlaces(scene: THREE.Scene, solids: THREE.Object3D[]) {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    return materials.get(color)!;
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const block = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, solid = true) => {
    const mesh = new THREE.Mesh(cube, material(color));
    mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    if (solid) { solids.push(mesh); const p = parent.position; blockers.push({x:p.x+x,z:p.z+z,w,d}); }
    return mesh;
  };
  const sign = (parent: THREE.Object3D, name: string, x: number, y: number, z: number, width: number, height: number, yaw = 0) => {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : undefined;
    if (canvas) { canvas.width = 1024; canvas.height = 640; }
    const texture = canvas ? new THREE.CanvasTexture(canvas) : undefined;
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: texture ? '#ffffff' : '#eadfc5', map: texture ?? null }));
    face.name = name; face.position.set(x, y, z); face.rotation.y = yaw; parent.add(face);
    return (heading: string, lines: string[], accent = '#496a5b') => {
      const ctx = canvas?.getContext('2d'); if (!ctx || !texture) return;
      ctx.fillStyle = '#eee6d2'; ctx.fillRect(0, 0, 1024, 640);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 1024, 90);
      ctx.fillStyle = '#f8f0dd'; ctx.font = 'bold 38px Georgia'; ctx.textAlign = 'center'; ctx.fillText(heading, 512, 59);
      ctx.fillStyle = '#35483d'; ctx.font = '31px Georgia';
      lines.forEach((line, i) => ctx.fillText(line, 512, 165 + i * 66)); texture.needsUpdate = true;
    };
  };
  const boundary = new THREE.Group(); boundary.name = 'woodland-survey-boundary'; boundary.position.set(boundaryPlace.x, terrainHeight(boundaryPlace.x, boundaryPlace.z), boundaryPlace.z); scene.add(boundary);
  for (const x of [-1.15, 1.15]) block(boundary, x, 1, 0, 0.12, 2, 0.12, '#8b7353');
  block(boundary, 0, 1.6, 0, 2.7, 1.75, 0.14, '#7d6b4f');
  const updateBoundary = sign(boundary, 'woodland-planning-notice', 0, 1.6, 0.08, 2.5, 1.55);
  for (const [x, z] of [[-3,-2],[-5,-5],[3,-3],[5,-6]]) {
    const y = terrainHeight(boundaryPlace.x + x, boundaryPlace.z + z) - boundary.position.y;
    block(boundary, x, y + 0.55, z, 0.1, 1.1, 0.1, '#a28b61', false);
    const ribbon = block(boundary, x + 0.18, y + 0.9, z, 0.5, 0.15, 0.04, '#d68543', false); ribbon.rotation.z = -0.2;
  }
  const boundaryFocus = new THREE.Object3D(); boundaryFocus.position.set(0, 1.6, 0.12); boundary.add(boundaryFocus);
  const paper = new THREE.Group(); paper.name = 'newspaper-noticeboard'; paper.position.set(paperPlace.x, terrainHeight(paperPlace.x, paperPlace.z), paperPlace.z); scene.add(paper);
  for (const x of [-1.3, 1.3]) block(paper, x, 1.1, 0, 0.14, 2.2, 0.14, '#5b7065');
  block(paper, 0, 1.7, 0, 2.9, 1.85, 0.17, '#5b7065');
  block(paper, 0, 2.7, 0, 3.2, 0.12, 0.8, '#687a6c', false);
  const updatePaper = sign(paper, 'willowbrook-paper-front-page', 0, 1.7, 0.095, 2.7, 1.65);
  let published: string | undefined;
  const setReportPublished = (value: boolean, harborShared = false) => {
    const state = `${value}-${harborShared}`;
    if (published === state) return; published = state;
    updateBoundary(value ? 'PUBLIC HEARING · ROUTE UNDER REVIEW' : 'PUBLIC PLANNING NOTICE', value ? ['Woodland access road proposal paused.', 'The existing footpath remains open.', 'Residents invited to an open hearing.', 'Survey markers retained for review.', 'Please keep to the public trail.'] : ['Proposed northern access road', 'Consultation boundary · WB / 24', 'Orange ribbons mark the surveyed route.', 'Existing public footpath remains open.', 'Plans available in Morning Paper Square.']);
    updatePaper('THE WILLOWBROOK PAPER', value && harborShared ? ['PEOPLE, PATHS AND LIVELIHOODS', 'Road proposal awaits an open hearing.', 'Harbor crew suggests a delivery bay.', 'Access and costs still need checking.', 'Ruth, Nessa and Kit tell their story.', 'Reporting: June · Photographs: you'] : value ? ['WOODLAND ROAD PLAN PAUSED', 'Photographs bring the route into view.', 'Public register confirms the proposal.', 'Vale: “The route is preliminary.”', 'Council announces an open hearing.', 'Reporting: June · Photographs: you'] : ['THE PATH WE SHARE', 'Running club raises funds for ridge steps.', 'Arthur’s old route needs a little care.', 'Planning notices available at the hall.', 'Speak to June in the square.']);
  };
  setReportPublished(false);
  const gallery = new THREE.Group(); gallery.name = 'willowbrook-gallery'; gallery.position.set(galleryPlace.x,terrainHeight(galleryPlace.x,galleryPlace.z),galleryPlace.z); scene.add(gallery);
  block(gallery,0,-0.14,0,12.4,0.4,12.4,'#a99d86',false);
  block(gallery,0,0.03,0,12,0.06,12,'#cbbda1',false);
  block(gallery,0,2,-6,12,4,0.2,'#e8dfc9');
  for (const x of [-6,6]) block(gallery,x,2,0,0.2,4,12,'#e8dfc9');
  block(gallery,0,4.15,0,12.6,0.3,12.6,'#687a6c',false);
  for (const x of [-4.5,4.5]) block(gallery,x,2,6,3,4,0.2,'#e8dfc9');
  block(gallery,0,3.5,6,6,1,0.2,'#496a5b',false);
  block(gallery,0,0.03,7,4,0.06,2,'#cbbda1',false);
  sign(gallery,'gallery-sign',0,3.5,6.13,5.8,0.8)(galleryPlace.name,[]);
  const frames: THREE.Mesh[] = [];
  const addFrame = (x:number,y:number,z:number,yaw:number) => {
    block(gallery,x,y,z, yaw === 0 ? 1.72 : 0.1,1.12,yaw === 0 ? 0.1 : 1.72,'#70543e',false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.96),new THREE.MeshBasicMaterial({color:'#d5cab2'}));
    face.position.set(x+Math.sin(yaw)*0.07,y,z+Math.cos(yaw)*0.07); face.rotation.y=yaw;
    face.name=`gallery-print-${frames.length}`; gallery.add(face); frames.push(face);
  };
  for (const y of [2.7,1.25]) for (const x of [-4.8,-2.88,-0.96,0.96,2.88,4.8]) addFrame(x,y,-5.82,0);
  for (const side of [-1,1]) for (const y of [2.7,1.25]) for (const z of [-3.6,-0.8,2]) addFrame(side*5.82,y,z,-side*Math.PI/2);
  const galleryLamp = new THREE.PointLight('#ffe5b4',22,17); galleryLamp.position.set(0,3.4,0); gallery.add(galleryLamp);
  const porch = new THREE.Group(); porch.name='arthur-home'; porch.position.set(unclePlace.x,terrainHeight(unclePlace.x,unclePlace.z),unclePlace.z); scene.add(porch);
  block(porch,0,-0.13,0,6.4,0.4,4.4,'#a99d86',false);
  block(porch,0,0.07,4.6,2.4,0.14,1.2,'#ae9270',false);
  block(porch,0,1.7,0,6,3.4,4,'#d9c5a1'); block(porch,0,3.5,0,6.6,0.3,4.6,'#8c7054',false);
  block(porch,0,0.15,3,6,0.3,2,'#ae9270',false);
  for (const x of [-2.6,2.6]) block(porch,x,1.6,3.5,0.14,3.2,0.14,'#8d7e60');
  block(porch,0,3.2,3,6.5,0.2,2.4,'#8c7054',false);
  block(porch,-1,1,2.02,1,2,0.05,'#687b61',false);
  block(porch,1.6,1.9,2.03,1.4,1.1,0.05,'#c3d6c2',false);
  block(porch,1,0.6,3,1.1,0.2,0.9,'#8d6a4b',false);
  block(porch,1,1,2.6,1.1,1,0.16,'#8d6a4b',false);
  // Arthur has his own seated model: bent knees, cardigan, spectacles and a lap blanket.
  const arthur = new THREE.Group(); arthur.name = 'uncle-arthur'; arthur.position.set(1, 0.3, 3.05); porch.add(arthur);
  const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
  const oval = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, parent: THREE.Object3D = arthur) => {
    const mesh = new THREE.Mesh(sphereGeometry, material(color)); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  oval(0, 0.92, -0.03, 0.34, 0.44, 0.24, '#728073');
  block(arthur, 0, 0.91, 0.205, 0.21, 0.65, 0.035, '#d1c3a5', false);
  for (const x of [-0.16,0.16]) {
    oval(x, 0.43, 0.22, 0.14, 0.13, 0.33, '#5c635b');
    oval(x, 0.24, 0.48, 0.11, 0.26, 0.11, '#5c635b');
    oval(x, 0.035, 0.57, 0.13, 0.08, 0.22, '#695841');
    oval(x*2, 1, 0, 0.11, 0.27, 0.12, '#728073');
    oval(x*1.85, 0.74, 0.19, 0.09, 0.09, 0.22, '#728073');
    oval(x*1.5, 0.72, 0.35, 0.095, 0.055, 0.09, '#d7b697');
    block(arthur, x*2, 0.61, 0.1, 0.11, 0.06, 0.65, '#8d6a4b', false);
  }
  oval(0, 1.39, 0, 0.12, 0.16, 0.12, '#d7b697');
  oval(0, 1.6, 0.025, 0.23, 0.28, 0.22, '#d7b697');
  oval(0, 1.79, -0.06, 0.235, 0.12, 0.2, '#d5d4c8');
  for (const side of [-1,1]) {
    oval(side*0.22, 1.61, 0.005, 0.055, 0.085, 0.05, '#d7b697');
    oval(side*0.09, 1.65, 0.214, 0.043, 0.025, 0.014, '#efe5ce');
    oval(side*0.09, 1.65, 0.227, 0.018, 0.02, 0.007, '#3a403b');
    oval(side*0.084, 1.657, 0.233, 0.005, 0.006, 0.004, '#fff0d2');
    const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.067, 0.009, 8, 20), material('#65716a'));
    glasses.position.set(side*0.095, 1.65, 0.243); arthur.add(glasses);
    oval(side*0.09, 1.72, 0.207, 0.077, 0.018, 0.012, '#d5d4c8');
  }
  block(arthur, 0, 1.65, 0.25, 0.06, 0.015, 0.012, '#65716a', false);
  oval(0, 1.57, 0.252, 0.05, 0.072, 0.048, '#c5a084');
  block(arthur, 0, 1.47, 0.225, 0.095, 0.015, 0.014, '#9d7863', false);
  block(arthur, 0, 0.58, 0.27, 0.6, 0.045, 0.58, '#ad9f82', false);
  for (const x of [-0.23,-0.1,0.03,0.16]) block(arthur,x,0.607,0.27,0.025,0.005,0.56,'#778775',false);
  const arthurRig = createIdleRig(arthur, [], true);
  // Merge Arthur by material to retain rounded detail with a handful of draw calls.
  for (const part of [arthur, arthurRig.torso, arthurRig.head]) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    part.children.forEach(child => { if (child instanceof THREE.Mesh && !Array.isArray(child.material)) { const list = batches.get(child.material) ?? []; list.push(child); batches.set(child.material, list); } });
    for (const [mat, meshes] of batches) {
      const geometries = meshes.map(mesh => { mesh.updateMatrix(); const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); return geometry.applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      meshes.forEach(mesh => part.remove(mesh)); const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = mesh.receiveShadow = true; part.add(mesh);
    }
  }
  // A second chair and the family tea things make the porch a place to return to.
  for (const x of [-1.8, 1]) for (const dx of [-0.43,0.43]) block(porch,x+dx,0.43,3.05,0.09,0.6,0.09,'#8d6a4b',false);
  block(porch,-1.8,0.8,3.05,1,0.15,0.9,'#8d6a4b',false);
  block(porch,-1.8,1.3,2.65,1,1,0.12,'#8d6a4b',false);
  block(porch,-0.5,0.78,3.15,0.8,0.1,0.85,'#a58864',false);
  block(porch,-0.5,0.4,3.15,0.12,0.8,0.12,'#8d6a4b',false);
  oval(-0.55,1.01,3.1,0.15,0.18,0.15,'#c3bfa6',porch);
  oval(-0.55,1.19,3.1,0.12,0.035,0.12,'#738575',porch);
  for (const x of [-0.75,-0.24]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.055,0.12,12), material('#ddd3b6')); cup.position.set(x,0.89,3.35); porch.add(cup);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.063,12), material('#78523a')); tea.rotation.x=-Math.PI/2; tea.position.set(x,0.953,3.35); porch.add(tea);
  }
  for (const x of [-2.6,2.6]) { block(porch,x,0.47,4,0.55,0.38,0.55,'#ac7958',false); oval(x,0.9,4,0.34,0.38,0.3,'#7b9665',porch); }
  const textures = new Map<string, THREE.Texture>();
  return {
    boundaryFocus, gallery, frames, setReportPublished,
    groundHeight(x:number,z:number) {
      if (Math.abs(x-galleryPlace.x)<5.9 && z>galleryPlace.z-5.9 && z<galleryPlace.z+8) return gallery.position.y+0.06;
      if (Math.abs(x-unclePlace.x)<3 && z>unclePlace.z+2 && z<unclePlace.z+4) return porch.position.y+0.3;
      return undefined;
    },
    update(time: number) { animateIdle(arthurRig, time, 47); },
    blocksWalking: (x:number,z:number) => blockers.some(b=>Math.abs(x-b.x)<b.w/2+0.2&&Math.abs(z-b.z)<b.d/2+0.2),
    displayPrints(prints: { photoId: string; image: string }[]) {
      frames.forEach((frame,i)=> {
        const material=frame.material as THREE.MeshBasicMaterial, print=prints[i];
        const current=frame.userData.photoId;
        if (current===print?.photoId) return;
        frame.userData.photoId=print?.photoId;
        material.map=null; material.color.set(print?'#ffffff':'#d5cab2'); material.needsUpdate=true;
        if (print && typeof document !== 'undefined') {
          const key=print.photoId;
          let texture=textures.get(key);
          if (!texture) { texture=new THREE.TextureLoader().load(print.image); texture.colorSpace=THREE.SRGBColorSpace; textures.set(key,texture); }
          material.map=texture; material.needsUpdate=true;
        }
      });
      const used=new Set(prints.slice(0,frames.length).map(p=>p.photoId));
      for (const [key,texture] of textures) if (!used.has(key)) { texture.dispose(); textures.delete(key); }
    },
  };
}

import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';

export const hospitalPlace = { name: 'Willowbrook Hospital', x: 60, z: 35, entrance: [60, 40] as const, recovery: [60, 35] as const };

export function createHospital(scene: THREE.Scene, solids: THREE.Object3D[]) {
  const group = new THREE.Group(); group.name = 'willowbrook-hospital';
  group.position.set(hospitalPlace.x, terrainHeight(hospitalPlace.x, hospitalPlace.z), hospitalPlace.z); scene.add(group);
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, solid = true) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: 0.8}));
    const mesh = new THREE.Mesh(geometry, materials.get(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    if (solid) { solids.push(mesh); blockers.push({ x: group.position.x + x, z: group.position.z + z, w, d }); }
  };
  // An open ward lets the player wake beside the bed and walk back into town.
  box(0,0,0,9,0.08,7,'#d8ddd4',false);
  box(0,2,-3.5,9,4,0.25,'#e4e8de');
  for (const x of [-4.5,4.5]) box(x,2,0,0.25,4,7,'#e4e8de');
  box(0,4.1,0,9.5,0.2,7.5,'#607e79',false);
  box(0,3.3,3.5,9,1.2,0.22,'#607e79',false);
  box(-2.3,0.65,-0.8,1.5,0.4,2.6,'#f1efdf');
  box(-2.3,0.9,-0.1,1.5,0.12,1.2,'#91b9ad',false);
  box(-2.3,0.9,-1.65,1.2,0.2,0.5,'#ffffff',false);
  for (const x of [-3,-1.6]) box(x,0.3,-0.8,0.09,0.6,2.4,'#6c7e80',false);
  box(2.8,0.65,-2,1.7,1.3,0.9,'#a7b7a8');
  box(0,3.35,3.65,0.22,0.8,0.06,'#f1efdf',false);
  box(0,3.35,3.66,0.8,0.22,0.06,'#f1efdf',false);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle='#607e79'; ctx.fillRect(0,0,768,128); ctx.fillStyle='#f1efdf'; ctx.font='42px Georgia'; ctx.textAlign='center'; ctx.fillText(hospitalPlace.name,384,80);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7,0.95), new THREE.MeshBasicMaterial({map:texture}));
      sign.position.set(0,3.3,3.68); group.add(sign);
    }
  }
  return {
    groundHeight: (x: number, z: number) => Math.abs(x-hospitalPlace.x) < 4.5 && Math.abs(z-hospitalPlace.z) < 3.5 ? group.position.y + 0.04 : undefined,
    blocksWalking: (x: number, z: number) => blockers.some(b => Math.abs(x-b.x) < b.w/2+0.25 && Math.abs(z-b.z) < b.d/2+0.25),
  };
}

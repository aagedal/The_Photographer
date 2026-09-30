import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';

export const cameraStore = { name: 'Willowbrook Camera Co.', x: 23, z: 23, entrance: [23, 31] as const, radius: 5.5 };
export function atCameraStore(x: number, y: number, z: number) {
  const [sx, sz] = cameraStore.entrance;
  return Math.hypot(x - sx, y - terrainHeight(sx, sz) - 1.7, z - sz) < cameraStore.radius;
}

export function createCameraStore(scene: THREE.Scene, solids: THREE.Object3D[]) {
  const group = new THREE.Group(); group.name = 'camera-store';
  group.position.set(cameraStore.x, terrainHeight(cameraStore.x, cameraStore.z), cameraStore.z);
  scene.add(group);
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, solid = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    if (solid) solids.push(mesh);
    return mesh;
  };
  block(0, 1.9, 0, 7, 3.8, 5, '#d8cfaf', true);
  block(0, 4, 0, 7.6, 0.35, 5.6, '#53685c');
  block(0, 1.2, 2.55, 1.2, 2.4, 0.1, '#53685c');
  for (const side of [-1, 1]) {
    block(side * 2.1, 1.9, 2.58, 2.2, 1.8, 0.12, '#8cbbb3');
    block(side * 2.1, 1.1, 2.7, 2.3, 0.12, 0.4, '#9c805a');
    // Cameras and lenses displayed in the windows.
    for (const offset of [-0.5, 0.5]) {
      block(side * 2.1 + offset, 1.4, 2.72, 0.45, 0.3, 0.22, '#31443e');
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.19, 12), new THREE.MeshStandardMaterial({ color: '#263935' }));
      lens.rotation.x = Math.PI / 2; lens.position.set(side * 2.1 + offset, 1.4, 2.9); group.add(lens);
    }
  }
  for (let i = 0; i < 10; i++) block(-3.15 + i * 0.7, 3, 3, 0.7, 0.16, 1.2, i % 2 ? '#d9c89d' : '#688879');
  block(0, 3.55, 2.6, 6.5, 0.65, 0.15, '#314e40');
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#314e40'; ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = '#f4e9c9'; ctx.font = '52px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(cameraStore.name, 512, 66);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 0.6), new THREE.MeshBasicMaterial({ map: texture }));
      sign.position.set(0, 3.55, 2.69); group.add(sign);
    }
  }
  return { blocksWalking: (x: number, z: number) => Math.abs(x - cameraStore.x) < 3.75 && Math.abs(z - cameraStore.z) < 2.75 };
}

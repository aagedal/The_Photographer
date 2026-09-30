import * as THREE from 'three';
import { fovForFocal } from './economy.ts';

export class ViewfinderState {
  progress = 0;
  target = 0;
  get transitioning() { return this.progress !== this.target; }
  request(raised: boolean, immediate = false) { this.target = raised ? 1 : 0; if (immediate) this.progress = this.target; }
  update(seconds: number) {
    const step = Math.max(0, seconds) / (this.target ? 0.24 : 0.18);
    this.progress = this.target ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step);
  }
  fov(lens: number, aspect: number) {
    const p = this.progress, eased = p * p * (3 - 2 * p);
    const wide = Math.tan(THREE.MathUtils.degToRad(fovForFocal(24, aspect)) / 2);
    const throughLens = Math.tan(THREE.MathUtils.degToRad(fovForFocal(lens, aspect)) / 2);
    return THREE.MathUtils.radToDeg(2 * Math.atan(THREE.MathUtils.lerp(wide, throughLens, eased)));
  }
}

// A separate overlay keeps the camera and hands out of saved photographs.
export function createCameraView() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.1, 10);
  scene.add(new THREE.HemisphereLight('#fff4dc', '#637365', 3));
  const group = new THREE.Group(); scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: '#35463c', roughness: 0.8 });
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, mat = material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); group.add(mesh);
  };
  block(0, 0, 0, 0.48, 0.3, 0.16); block(-0.06, 0.18, 0, 0.16, 0.08, 0.14);
  block(0, 0, 0.085, 0.32, 0.21, 0.01, new THREE.MeshStandardMaterial({ color: '#8caca2' }));
  const skin = new THREE.MeshStandardMaterial({ color: '#bd9678', roughness: 0.95 });
  for (const side of [-1, 1]) block(side * 0.25, -0.06, 0.035, 0.11, 0.22, 0.17, skin);
  return { scene, camera, update(progress: number, aspect: number) {
    camera.aspect = aspect; camera.updateProjectionMatrix();
    group.position.set(0.13 * (1 - progress), -0.85 + progress * 0.75, -1.2);
    group.rotation.set(-0.2 * (1 - progress), 0, -0.08 * (1 - progress));
  } };
}

import * as THREE from 'three';

// A separate first-person scene: the unfolding tripod never appears in captured photos.
export function createTripodView() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 10);
  const group = new THREE.Group(); scene.add(group);
  const materials = ['#344b40', '#536e58', '#b2bea2', '#dcc2a0'].map(color => new THREE.MeshBasicMaterial({ color, transparent: true }));
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials[colour]); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  box(0, 0, 0, 0.07, 0.32, 0.07, 1);
  box(0, 0.17, 0, 0.22, 0.055, 0.15, 2);
  box(0, 0.26, 0, 0.31, 0.16, 0.12, 0);
  box(0.12, 0.25, 0.04, 0.07, 0.16, 0.12, 1);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 8), materials[1]);
  lens.rotation.x = Math.PI / 2; lens.position.set(-0.025, 0.26, -0.1); group.add(lens);
  const legs: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const root = new THREE.Group(); root.rotation.y = i * Math.PI * 2 / 3; root.position.y = -0.08; group.add(root);
    const hinge = new THREE.Group(); root.add(hinge); legs.push(hinge);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.57, 0.035), materials[i === 1 ? 2 : 1]); leg.position.y = -0.285; hinge.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.06), materials[0]); foot.position.y = -0.57; hinge.add(foot);
  }
  const leftHand = box(-0.23, 0.12, 0.07, 0.1, 0.14, 0.12, 3);
  const rightHand = box(0.23, 0.12, 0.07, 0.1, 0.14, 0.12, 3);
  return {
    scene, camera,
    update(progress: number, opacity: number, aspect: number) {
      camera.aspect = aspect; camera.updateProjectionMatrix();
      const rise = 1 - (1 - progress) ** 3;
      group.position.set(0, -0.1 - (1 - rise) * 0.9, -1.45);
      group.rotation.z = Math.sin(progress * Math.PI) * 0.05;
      for (const leg of legs) leg.rotation.z = progress * 0.55;
      leftHand.position.x = -0.23 - Math.max(0, progress - 0.7) * 0.3;
      rightHand.position.x = 0.23 + Math.max(0, progress - 0.7) * 0.3;
      for (const material of materials) material.opacity = opacity;
    },
  };
}

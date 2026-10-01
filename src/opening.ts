import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';
import { createIdleRig, animateIdle } from './character-idle.ts';
import { arrivalPose, ARRIVAL_DURATION, boatBerth } from './arrival-route.ts';
export { ARRIVAL_DURATION } from './arrival-route.ts';

export const openingScenes = [
  { title: 'Coming home to Willowbrook.', speaker: 'Arthur · A letter from your uncle', line: 'The doctors say I haven’t long. If you can, come stay. There’s a pale bear in the northern woods I saw once when I was young. I’d love to see it again. Mostly, I’d love to see you.', action: 'Step ashore' },
  { title: 'Begin with a quiet moment.', speaker: 'Mara · Creek ranger', line: 'Arthur told me you were coming. I’ll help you find his bear, but you need a telephoto lens to keep your distance. First, try the deer in the western meadow. Here’s a camera to get you started.', action: 'Take the camera' },
  { title: 'A photograph worth bringing home.', speaker: 'Mara · Creek ranger', line: 'You passed Bracken Head’s light on the ferry. Beyond town, the old observatory, stone railway arches and Briar Hill’s sails still mark Arthur’s walks. Start with the western trail past the chapel. C to sneak; Space for the shutter. Print your deer photograph at the gallery, then show Arthur. You have a room in town when you’re ready to settle in.', action: 'Start exploring' },
];
export const arrivalPosition = [8, 94] as const;

export function createOpening(scene: THREE.Scene) {
  const boat = new THREE.Group(); boat.name = 'arrival-boat'; scene.add(boat);
  const block = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  // A shaped hull, raised bow and small working wheelhouse replace the box ferry.
  const outline = new THREE.Shape();
  outline.moveTo(-1.55, 3.3); outline.lineTo(1.55, 3.3); outline.lineTo(1.55, -1.9);
  outline.quadraticCurveTo(1.4, -3.2, 0, -4); outline.quadraticCurveTo(-1.4, -3.2, -1.55, -1.9); outline.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.95, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 1, curveSegments: 12 });
  hullGeometry.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ color: '#446b65', roughness: 0.72 }));
  hull.position.y = 0.85; hull.castShadow = hull.receiveShadow = true; boat.add(hull);
  const deckGeometry = new THREE.ShapeGeometry(outline, 12); deckGeometry.rotateX(Math.PI / 2);
  const deck = new THREE.Mesh(deckGeometry, new THREE.MeshStandardMaterial({ color: '#b7a17a', side: THREE.DoubleSide })); deck.position.y = 0.91; boat.add(deck);
  for (const side of [-1, 1]) {
    block(boat, side * 1.45, 1.1, 0.35, 0.12, 0.35, 5.6, '#55776e');
    block(boat, side * 1.49, 1.48, 0.7, 0.065, 0.065, 4.8, '#ddd4b9');
    for (const z of [-1.5, 0, 2.6]) {
      block(boat, side * 1.49, 1.28, z, 0.055, 0.42, 0.055, '#ddd4b9');
      const fender = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 8), new THREE.MeshStandardMaterial({ color: '#d1cbb4', roughness: 0.9 })); fender.position.set(side * 1.62, 0.55, z); boat.add(fender);
    }
  }
  block(boat, 0, 1.77, -0.7, 2, 1.7, 2.1, '#ded3b5');
  block(boat, 0, 2.05, -1.76, 1.64, 0.65, 0.055, '#7fa6a5');
  block(boat, 0, 2.05, -1.8, 0.08, 0.68, 0.04, '#586f65');
  for (const side of [-1, 1]) block(boat, side * 1.02, 2.02, -0.8, 0.05, 0.65, 1.28, '#7fa6a5');
  block(boat, 0, 2.7, -0.7, 2.3, 0.15, 2.4, '#41594f');
  block(boat, 0.5, 3.32, -0.5, 0.065, 1.25, 0.065, '#d7c9a9');
  block(boat, 0.5, 3.58, -0.5, 0.75, 0.06, 0.06, '#d7c9a9');
  block(boat, -0.6, 2.96, 0, 0.23, 0.45, 0.24, '#505a4c');
  block(boat, 0, 1.2, 2.6, 2.4, 0.5, 0.55, '#947958');
  const lifebuoy = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.085, 8, 20), new THREE.MeshStandardMaterial({ color: '#dc9a68' })); lifebuoy.position.set(0.5, 1.65, 0.37); boat.add(lifebuoy);
  for (const side of [-1, 1]) block(boat, side, 2.75, -1.55, 0.13, 0.1, 0.12, side < 0 ? '#c57662' : '#9fc39b');
  boat.position.set(boatBerth[0], 0.05, boatBerth[1]);
  const wake = new THREE.Group(); wake.name = 'arrival-wake'; scene.add(wake);
  const wakeMaterial = new THREE.MeshBasicMaterial({ color: '#e0ece0', transparent: true, opacity: 0.25, depthWrite: false });
  for (const side of [-1, 1]) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 18), wakeMaterial); streak.rotation.x = -Math.PI / 2; streak.rotation.z = side * 0.18; streak.position.set(side * 2.2, 0.13, 10); wake.add(streak);
  }
  const dock = new THREE.Group(); dock.name = 'arrival-dock'; scene.add(dock);
  block(dock, 8, 0.5, 98, 2.4, 0.3, 13, '#a17c52');
  for (const x of [6.9, 9.1]) for (const z of [93, 98, 103]) block(dock, x, 0.2, z, 0.18, 1.7, 0.18, '#755a42');
  const ranger = scene.getObjectByName('npc-ranger')!.clone(); ranger.name = 'arrival-ranger';
  ranger.getObjectByName('npc-marker-ranger')?.removeFromParent();
  const rangerRig = createIdleRig(ranger, ranger.children.filter((child): child is THREE.Group => child instanceof THREE.Group && child.name === 'character-arm'));
  ranger.position.set(8, terrainHeight(8, 89), 89); ranger.rotation.y = 0; ranger.visible = false; scene.add(ranger);
  const gift = new THREE.Group(); gift.name = 'intro-camera'; gift.visible = false; scene.add(gift);
  block(gift, 0, 0, 0, 0.45, 0.29, 0.15, '#2e423a');
  block(gift, -0.09, 0.18, 0, 0.16, 0.08, 0.12, '#53685c');
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#202f2b', metalness: 0.35, roughness: 0.3 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.14; gift.add(lens);
  return {
    update(camera: THREE.PerspectiveCamera, step: number, seconds: number, reducedMotion: boolean) {
      const pose = arrivalPose(step === 0 && !reducedMotion ? seconds : ARRIVAL_DURATION);
      boat.position.x = pose.x; boat.position.z = pose.z; boat.rotation.y = pose.yaw;
      wake.position.set(pose.x, 0, pose.z); wake.rotation.y = pose.yaw;
      wake.visible = step === 0 && pose.progress < 0.97;
      wakeMaterial.opacity = 0.15 + Math.sin(Math.min(1, pose.progress) * Math.PI) * 0.14;
      boat.position.y = reducedMotion ? 0.05 : 0.05 + Math.sin(seconds * 1.2) * 0.035;
      gift.visible = step === 2; ranger.visible = step > 0;
      animateIdle(rangerRig, seconds, 3);
      if (step === 0) {
        camera.fov = 62; camera.updateProjectionMatrix();
        const t = pose.progress, reveal = t * t * (3 - 2 * t);
        camera.position.set(pose.x + 18, 6.8 - reveal * 2, pose.z + 17);
        camera.lookAt(pose.x + 2 - Math.sin(t * Math.PI) * 15, 9 - reveal * 6, pose.z - 22);

      } else {
        camera.position.set(8, 2.2, 94);
        camera.lookAt(8, terrainHeight(8, 89) + 1.4, 89);
        if (step === 2) {
          gift.position.copy(camera.position).add(new THREE.Vector3(-0.35, 0.22, -2).applyQuaternion(camera.quaternion));
          gift.quaternion.copy(camera.quaternion);
        }
      }
      camera.updateMatrixWorld();
    },
    finish() { gift.visible = false; ranger.visible = false; boat.position.set(boatBerth[0], 0.05, boatBerth[1]); boat.rotation.y = 0; wake.visible = false; },
    dockHeight(x: number, z: number) { return Math.abs(x - 8) < 1.2 && z >= 91.5 && z <= 104.5 ? 0.65 : terrainHeight(x, z); },
    onDock(x: number, z: number) { return Math.abs(x - 8) < 1.1 && z >= 91.5 && z <= 104.4; },
  };
}

import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';

export const openingScenes = [
  { title: 'A place worth finding.', speaker: 'The boatman', line: 'Willowbrook. End of the line. You picked a fine evening to arrive.', action: 'Step ashore' },
  { title: 'One small assignment.', speaker: 'Mara · Creek ranger', line: 'Fancy a little hunting? There’s a deer in the western meadow. I’d like you to take a shot.', action: 'Take the camera' },
  { title: 'Bring back a photograph.', speaker: 'Mara · Creek ranger', line: 'Here. Your camera. Walk inland from the dock, then take the western trail past the chapel into the meadow. Press C to sneak as you approach the deer, and Space for the shutter. We leave only footprints here.', action: 'Start exploring' },
];
export const arrivalPosition = [8, 94] as const;

export function createOpening(scene: THREE.Scene) {
  const boat = new THREE.Group(); boat.name = 'arrival-boat'; scene.add(boat);
  const block = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  block(boat, 0, 0.4, 0, 2.6, 0.6, 5.4, '#55776e');
  block(boat, 0, 0.74, 0, 2.3, 0.12, 4.9, '#c1a17b');
  for (const side of [-1, 1]) block(boat, side * 1.2, 1, 0, 0.16, 0.6, 5, '#55776e');
  block(boat, 0, 1.6, -0.9, 1.8, 1.5, 1.7, '#e3d8ba');
  block(boat, 0, 1.9, -1.78, 1.5, 0.5, 0.04, '#92bab7');
  block(boat, 0, 2.43, -0.9, 2.1, 0.15, 2, '#53675a');
  boat.position.set(5, 0.05, 103); boat.rotation.y = Math.PI;
  const dock = new THREE.Group(); dock.name = 'arrival-dock'; scene.add(dock);
  block(dock, 8, 0.5, 98, 2.4, 0.3, 13, '#a17c52');
  for (const x of [6.9, 9.1]) for (const z of [93, 98, 103]) block(dock, x, 0.2, z, 0.18, 1.7, 0.18, '#755a42');
  const ranger = scene.getObjectByName('npc-ranger')!.clone(); ranger.name = 'arrival-ranger';
  ranger.getObjectByName('npc-marker-ranger')?.removeFromParent();
  ranger.position.set(8, terrainHeight(8, 89), 89); ranger.rotation.y = 0; ranger.visible = false; scene.add(ranger);
  const gift = new THREE.Group(); gift.name = 'intro-camera'; gift.visible = false; scene.add(gift);
  block(gift, 0, 0, 0, 0.45, 0.29, 0.15, '#2e423a');
  block(gift, -0.09, 0.18, 0, 0.16, 0.08, 0.12, '#53685c');
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#202f2b', metalness: 0.35, roughness: 0.3 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.14; gift.add(lens);
  return {
    update(camera: THREE.PerspectiveCamera, step: number, seconds: number, reducedMotion: boolean) {
      const t = reducedMotion ? 1 : Math.min(1, seconds / 6);
      const ease = t * t * (3 - 2 * t);
      boat.position.z = step === 0 ? 118 - ease * 15 : 103;
      boat.position.y = reducedMotion ? 0.05 : 0.05 + Math.sin(seconds * 1.2) * 0.035;
      gift.visible = step === 2; ranger.visible = step > 0;
      if (step === 0) {
        camera.position.set(14 - ease * 2, 5 - ease * 1.5, 124 - ease * 14);
        camera.lookAt(5, 1.3, boat.position.z - 1);
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
    finish() { gift.visible = false; ranger.visible = false; boat.position.set(5, 0.05, 103); },
    dockHeight(x: number, z: number) { return Math.abs(x - 8) < 1.2 && z >= 91.5 && z <= 104.5 ? 0.65 : terrainHeight(x, z); },
    onDock(x: number, z: number) { return Math.abs(x - 8) < 1.1 && z >= 91.5 && z <= 104.4; },
  };
}

import * as THREE from 'three';
import { fovForFocal } from './economy.ts';
import type { Mission } from './missions.ts';

/** Check context against the saved 3:2 sensor crop, including its sightlines. */
export function contextInFrame(subjects: Map<string, THREE.Object3D>, solids: THREE.Object3D[], mission: Mission, camera: THREE.PerspectiveCamera, focalLength: number) {
  if (!mission.contextSubjects) return undefined;
  const lensCamera = camera.clone(); lensCamera.fov = fovForFocal(focalLength, camera.aspect); lensCamera.updateProjectionMatrix();
  const cropX = Math.min(1, 1.5 / camera.aspect), cropY = Math.min(1, camera.aspect / 1.5);
  const ray = new THREE.Raycaster();
  return mission.contextSubjects.every(name => {
    const object = subjects.get(name); if (!object) return false;
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false;
    const points = (object.userData.framePoints as [number,number,number][] | undefined) ?? [[0,0,0]];
    return points.every(coords => {
      const point = object.localToWorld(new THREE.Vector3(...coords));
      const projected = point.clone().project(lensCamera);
      if (projected.z <= -1 || projected.z >= 1 || Math.abs(projected.x / cropX) >= 0.9 || Math.abs(projected.y / cropY) >= 0.9) return false;
      const direction = point.sub(camera.position), distance = direction.length();
      ray.set(camera.position,direction.normalize()); ray.far = Math.max(0,distance-0.3);
      return ray.intersectObjects(solids,false).length === 0;
    });
  });
}

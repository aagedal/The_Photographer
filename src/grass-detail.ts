import * as THREE from 'three';
import { partitionScenery } from './scenery-batches.ts';

// Distances are measured at a 58-degree vertical field of view. Narrow lenses
// retain detail farther away; reflection and capture cameras use their own FOV.
export const GRASS_REFERENCE_PROJECTION = 1 / Math.tan(THREE.MathUtils.degToRad(58 / 2));
export function grassDensity(distance: number) {
  return (1 - THREE.MathUtils.smoothstep(distance, 18, 42)) * 0.65
    + (1 - THREE.MathUtils.smoothstep(distance, 42, 80)) * 0.25
    + (1 - THREE.MathUtils.smoothstep(distance, 80, 120)) * 0.1;
}

const sphere = new THREE.Sphere(), cameraPosition = new THREE.Vector3();
const instance = new THREE.Matrix4(), origin = new THREE.Vector3();
export class GrassBatch extends THREE.InstancedMesh {
  readonly capacity: number;
  constructor(source: THREE.InstancedMesh) {
    // Each tile owns just its rank attribute; blade geometry stays tiny.
    super(source.geometry.clone(), source.material, source.count);
    this.name = source.name; this.capacity = source.count;
    this.instanceMatrix = source.instanceMatrix; this.instanceColor = source.instanceColor;
    this.receiveShadow = source.receiveShadow;
    this.boundingSphere = source.boundingSphere!.clone();
    this.geometry.setAttribute('grassRank', new THREE.InstancedBufferAttribute(
      Float32Array.from({ length: this.capacity }, (_, i) => i / this.capacity), 1));
  }
  drawCount(camera: THREE.Camera) {
    sphere.copy(this.boundingSphere!).applyMatrix4(this.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    const distance = Math.max(0, cameraPosition.distanceTo(sphere.center) - sphere.radius);
    const projection = Math.max(0.001, camera.projectionMatrix.elements[5]);
    // Include the shader's transition band. Bounds remain those of the full
    // tile, rather than changing as the instance prefix gets shorter.
    const density = grassDensity(distance * GRASS_REFERENCE_PROJECTION / projection);
    return density === 0 ? 0 : Math.min(this.capacity, Math.ceil((density + 0.06) * this.capacity));
  }
  onBeforeRender(_renderer: THREE.WebGLRenderer, _scene: THREE.Scene, camera: THREE.Camera) {
    this.count = this.drawCount(camera);
  }
  onAfterRender() {
    // CPU focus picking and the next camera must see the complete tile.
    this.count = this.capacity;
  }
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const camera = raycaster.camera;
    if (!camera) { super.raycast(raycaster, intersects); return; }
    const start = intersects.length, count = this.count;
    this.count = this.drawCount(camera);
    try { super.raycast(raycaster, intersects); } finally { this.count = count; }
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    const projection = Math.max(0.001, camera.projectionMatrix.elements[5]);
    for (let i = intersects.length - 1; i >= start; i--) {
      const id = intersects[i].instanceId!;
      this.getMatrixAt(id, instance); origin.setFromMatrixPosition(instance).applyMatrix4(this.matrixWorld);
      const density = grassDensity(origin.distanceTo(cameraPosition) * GRASS_REFERENCE_PROJECTION / projection);
      if (density === 0 || density <= id / this.capacity - 0.03) intersects.splice(i, 1);
    }
  }
}

export function partitionGrass(source: THREE.InstancedMesh, tileSize = 24) {
  const tiles = partitionScenery(source, tileSize), group = new THREE.Group();
  group.name = source.name;
  for (const tile of tiles.children) group.add(new GrassBatch(tile as THREE.InstancedMesh));
  return group;
}

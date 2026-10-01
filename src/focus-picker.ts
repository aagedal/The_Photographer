import * as THREE from 'three';

function focusable(mesh: THREE.Mesh) {
  for (let object: THREE.Object3D | null = mesh; object; object = object.parent) if (!object.visible) return false;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some(material => material.depthWrite && material.opacity >= 0.9);
}

// CPU-only tiles share the rendered heightfield's vertices and exact triangles.
// A downward focus ray tests a few hundred triangles instead of the whole map.
function terrainFocusTiles(land: THREE.Mesh<THREE.PlaneGeometry>) {
  const { widthSegments: nx, heightSegments: nz } = land.geometry.parameters;
  const positions = land.geometry.getAttribute('position'), index = land.geometry.index!;
  const tiles: THREE.Mesh[] = [], point = new THREE.Vector3(), step = 16;
  for (let z = 0; z < nz; z += step) for (let x = 0; x < nx; x += step) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', positions);
    const indices: number[] = [], bounds = new THREE.Box3();
    const endX = Math.min(nx, x + step), endZ = Math.min(nz, z + step);
    for (let iz = z; iz < endZ; iz++) for (let ix = x; ix < endX; ix++) {
      const start = (iz * nx + ix) * 6;
      for (let i = 0; i < 6; i++) indices.push(index.getX(start + i));
    }
    for (let iz = z; iz <= endZ; iz++) for (let ix = x; ix <= endX; ix++) {
      bounds.expandByPoint(point.fromBufferAttribute(positions, iz * (nx + 1) + ix));
    }
    geometry.setIndex(indices); geometry.boundingBox = bounds;
    geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    tiles.push(new THREE.Mesh(geometry, land.material));
  }
  return tiles;
}

export function createFocusPicker(scene: THREE.Scene) {
  const entries: { mesh: THREE.Mesh; source: THREE.Mesh; local: THREE.Box3; world: THREE.Box3; matrix: THREE.Matrix4 }[] = [];
  const sphere = new THREE.Sphere();
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const meshes = object.name === 'rolling-terrain' && object.geometry instanceof THREE.PlaneGeometry
      ? terrainFocusTiles(object as THREE.Mesh<THREE.PlaneGeometry>) : [object];
    for (const mesh of meshes) {
      let local: THREE.Box3;
      if (mesh instanceof THREE.InstancedMesh) {
        if (!mesh.boundingSphere) mesh.computeBoundingSphere();
        // Animated schools already supply bounds for the whole swim path.
        local = sphere.copy(mesh.boundingSphere!).getBoundingBox(new THREE.Box3());
      } else {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        local = mesh.geometry.boundingBox!.clone();
      }
      if (object.name.startsWith('wind-meadow-grass')) local.expandByScalar(0.5);
      entries.push({ mesh, source: object, local,
        world: local.clone().applyMatrix4(object.matrixWorld), matrix: object.matrixWorld.clone() });
    }
  });
  const point = new THREE.Vector3();
  const stats = { candidates: 0, raycasts: 0 };
  return {
    stats,
    pick(raycaster: THREE.Raycaster): THREE.Intersection | undefined {
      const candidates: { entry: typeof entries[number]; distance: number }[] = [];
      for (const entry of entries) {
        if (!entry.source.layers.test(raycaster.layers) || !focusable(entry.source)) continue;
        if (!entry.matrix.equals(entry.source.matrixWorld)) {
          entry.matrix.copy(entry.source.matrixWorld);
          entry.world.copy(entry.local).applyMatrix4(entry.matrix);
        }
        if (!raycaster.ray.intersectBox(entry.world, point)) continue;
        const distance = entry.world.containsPoint(raycaster.ray.origin) ? 0 : point.distanceTo(raycaster.ray.origin);
        if (distance <= raycaster.far) candidates.push({ entry, distance });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      stats.candidates = candidates.length; stats.raycasts = 0;
      let closest: THREE.Intersection | undefined;
      const hits: THREE.Intersection[] = [];
      for (const { entry, distance } of candidates) {
        if (closest && distance > closest.distance) break;
        entry.mesh.matrixWorld.copy(entry.source.matrixWorld);
        entry.mesh.material = entry.source.material;
        hits.length = 0; stats.raycasts++;
        entry.mesh.raycast(raycaster, hits);
        for (const hit of hits) if (!closest || hit.distance < closest.distance) closest = { ...hit, object: entry.source };
      }
      return closest;
    },
  };
}

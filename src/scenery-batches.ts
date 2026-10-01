import * as THREE from 'three';

// A map-wide InstancedMesh has one map-wide bounding sphere: looking at a
// single tree sends every tree to the GPU. Partition without dropping detail.
export function partitionScenery(source: THREE.InstancedMesh, tileSize = 64) {
  const group = new THREE.Group(); group.name = source.name;
  const cells = new Map<string, number[]>(), matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, matrix);
    const key = `${Math.floor(matrix.elements[12] / tileSize)},${Math.floor(matrix.elements[14] / tileSize)}`;
    const indices = cells.get(key) ?? []; indices.push(i); cells.set(key, indices);
  }
  for (const [cell, indices] of cells) {
    const mesh = new THREE.InstancedMesh(source.geometry, source.material, indices.length);
    mesh.name = `${source.name}-cell-${cell}`;
    mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow;
    indices.forEach((original, i) => {
      source.getMatrixAt(original, matrix); mesh.setMatrixAt(i, matrix);
      if (source.instanceColor) { source.getColorAt(original, color); mesh.setColorAt(i, color); }
    });
    mesh.computeBoundingSphere();
    // Wind stays within this padding, including the tips of the grass blades.
    mesh.boundingSphere!.radius += 0.5;
    group.add(mesh);
  }
  return group;
}

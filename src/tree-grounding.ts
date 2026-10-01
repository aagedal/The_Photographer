import { terrainSurfaceHeight } from './terrain.ts';

export const TREE_ROOT_DEPTH = 0.18;

// Bury the whole base, including its downhill edge. Keep the trunk's top and
// canopy at their original height by extending the trunk down to this level.
export function treeRootHeight(x: number, z: number, halfWidth: number, halfDepth = halfWidth,
  surfaceHeight: (x: number, z: number) => number = terrainSurfaceHeight) {
  let lowest = Infinity;
  for (const dx of [-halfWidth, 0, halfWidth]) for (const dz of [-halfDepth, 0, halfDepth])
    lowest = Math.min(lowest, surfaceHeight(x + dx, z + dz));
  return lowest - TREE_ROOT_DEPTH;
}

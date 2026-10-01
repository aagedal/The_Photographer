import * as THREE from 'three';

type Surface = 'earth' | 'gravel' | 'asphalt' | 'paving';
const TILE_METRES = 4;

// Periodic value noise gives the tiles soft patches without visible seams.
function noise(x: number, y: number, cells: number, salt: number) {
  const hash = (a: number, b: number) => {
    const value = Math.sin((a % cells) * 127.1 + (b % cells) * 311.7 + salt) * 43758.5453;
    return value - Math.floor(value);
  };
  const px = x * cells, py = y * cells, ix = Math.floor(px), iy = Math.floor(py);
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const u = smooth(px - ix), v = smooth(py - iy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u),
    THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}

export function createGroundSurfaces() {
  const materials = new Map<Surface, THREE.MeshStandardMaterial>();
  const variants = new Map<string, THREE.MeshStandardMaterial>();
  function material(kind: Surface) {
    if (materials.has(kind)) return materials.get(kind)!;
    const size = 256, pixels = new Uint8Array(size * size * 4), heights = new Uint8Array(pixels.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const patch = noise(u, v, 4, 23), grain = noise(u, v, 96, 61), fine = noise(u, v, 128, 37);
      // Each slab is a metre square. Hairline mortar stays subdued at distance.
      const joint = kind === 'paving' && (x % 64 < 1 || y % 64 < 1);
      const value = joint ? 145 : kind === 'earth' ? 215 + patch * 27 + grain * 10
        : kind === 'gravel' ? 204 + patch * 18 + grain * 32
        : kind === 'asphalt' ? 217 + grain * 28 : 229 + patch * 13 + fine * 10;
      const height = joint ? 40 : kind === 'earth' ? 80 + patch * 40 + grain * 35
        : 65 + grain * 85 + fine * 35;
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
      heights[i] = heights[i + 1] = heights[i + 2] = height; heights[i + 3] = 255;
    }
    const texture = (data: Uint8Array, colorSpace: THREE.ColorSpace) => {
      const map = new THREE.DataTexture(data, size, size);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
      map.generateMipmaps = true; map.anisotropy = 4; map.colorSpace = colorSpace; map.needsUpdate = true;
      return map;
    };
    const result = new THREE.MeshStandardMaterial({
      map: texture(pixels, THREE.SRGBColorSpace), bumpMap: texture(heights, THREE.NoColorSpace),
      bumpScale: kind === 'earth' ? 0.035 : kind === 'gravel' ? 0.028 : 0.012,
      roughness: kind === 'asphalt' ? 0.94 : 1,
    });
    result.name = `ground-${kind}`; materials.set(kind, result); return result;
  }
  return {
    // World-space UVs keep texel size constant on hills, ribbons and scaled boxes.
    // Clone shared primitives before changing UVs so props keep their own maps.
    apply(mesh: THREE.Mesh, kind: Surface, color?: string, vertexColors = false) {
      mesh.updateWorldMatrix(true, false);
      const geometry = mesh.geometry.clone(), positions = geometry.getAttribute('position');
      const uv = new Float32Array(positions.count * 2), point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        uv[i * 2] = point.x / TILE_METRES; uv[i * 2 + 1] = point.z / TILE_METRES;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); mesh.geometry = geometry;
      const base = material(kind);
      // Shared colours let static ground strips participate in material batching.
      const side = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).side;
      const key = `${kind}:${color ?? 'vertices'}:${side}`;
      let surface = variants.get(key);
      if (!surface) {
        surface = base.clone(); surface.vertexColors = vertexColors; surface.side = side;
        if (color) surface.color.set(color);
        variants.set(key, surface);
      }
      mesh.material = surface;
    },
  };
}

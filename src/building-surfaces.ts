import * as THREE from 'three';

// Small, seamless material tiles: surface detail costs no extra scene objects.
// Data textures also work in the headless world/collision tests.
export function createBuildingSurfaces() {
  const tile = (kind: 'timber' | 'slate' | 'stone') => {
    const size = 128, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const row = Math.floor(y / 32), seam = y % 32 < 2;
      const grain = Math.sin(y * Math.PI / 2 + Math.sin(x * Math.PI / 32) * 1.5);
      const random = (a: number, b: number) => { const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return value - Math.floor(value); };
      const noise = random(x, y) - 0.5;
      const joint = (x + (row % 2) * 32) % 64 < 2;
      const block = Math.floor((x + (row % 2) * 32) / 64);
      const variation = random(block, row) * 16;
      const value = kind === 'timber' ? (seam ? 170 : 228 + random(0, row) * 14 + grain * 3 + noise * 4)
        : kind === 'slate' ? (seam || joint ? 135 : 210 + variation + noise * 9)
        : (seam || joint ? 160 : 220 + variation + noise * 10);
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
    }
    const map = new THREE.DataTexture(pixels, size, size);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.anisotropy = 4; map.colorSpace = THREE.SRGBColorSpace;
    map.repeat.set(kind === 'timber' ? 2 : 3, kind === 'timber' ? 3 : 2);
    map.needsUpdate = true;
    const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
    return { map, bump };
  };
  const timber = tile('timber'), slate = tile('slate'), stone = tile('stone');
  // Painted sky highlights and curtains suit the stylized town without a
  // reflection render per window. The emissive mask lights the room at dusk.
  const size = 64, glass = new Uint8Array(size * size * 4), room = new Uint8Array(glass.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1), i = (y * size + x) * 4;
    const curtain = u < 0.19 || u > 0.81;
    const fold = Math.sin(u * Math.PI * 48) * 5;
    const highlight = Math.max(0, 1 - Math.abs(u + v * 0.65 - 0.8) * 18) * 22;
    glass[i] = curtain ? 133 + fold : 46 + v * 47 + highlight;
    glass[i + 1] = curtain ? 131 + fold : 68 + v * 58 + highlight;
    glass[i + 2] = curtain ? 111 + fold : 72 + v * 62 + highlight;
    glass[i + 3] = room[i + 3] = 255;
    room[i] = room[i + 1] = room[i + 2] = curtain ? 110 + fold : 215;
  }
  const windowMap = (data: Uint8Array) => {
    const map = new THREE.DataTexture(data, size, size); map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.needsUpdate = true; return map;
  };
  const walls = new Map<string, THREE.MeshStandardMaterial>();
  return {
    wall(color: string) {
      if (!walls.has(color)) walls.set(color, new THREE.MeshStandardMaterial({ color, map: timber.map, bumpMap: timber.bump, bumpScale: 0.028, roughness: 0.92 }));
      return walls.get(color)!;
    },
    roof: new THREE.MeshStandardMaterial({ color: '#74695e', map: slate.map, bumpMap: slate.bump, bumpScale: 0.045, roughness: 0.92, side: THREE.DoubleSide }),
    foundation: new THREE.MeshStandardMaterial({ color: '#aaa28f', map: stone.map, bumpMap: stone.bump, bumpScale: 0.04, roughness: 1 }),
    window: new THREE.MeshStandardMaterial({ map: windowMap(glass), emissiveMap: windowMap(room), emissive: '#ffc078', emissiveIntensity: 0, roughness: 0.24, metalness: 0.12 }),
  };
}

export function gabledRoof(width: number, depth: number, rise: number) {
  const w = width / 2, d = depth / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -w,0,d, 0,rise,d, -w,0,-d, 0,rise,d, 0,rise,-d, -w,0,-d,
    0,rise,d, w,0,d, 0,rise,-d, w,0,d, w,0,-d, 0,rise,-d,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0,0, 0,1, 1,0, 0,1, 1,1, 1,0,
    0,1, 0,0, 1,1, 0,0, 1,0, 1,1,
  ], 2));
  geometry.computeVertexNormals();
  return geometry;
}

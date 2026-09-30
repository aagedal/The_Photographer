import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { creekPath, creekPoint } from './creek.ts';
import { createWaterSurface } from './water.ts';

export function createWaterfall() {
  const group = new THREE.Group(); group.name = 'fern-creek';
  const solids: THREE.Mesh[] = [];
  const seed = (n: number) => { const a = Math.sin(n * 127.1 + 311.7) * 43758.5453; return a - Math.floor(a); };
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  // Offset rock strata give the cliff an irregular silhouette and exposed ledges.
  const tiers = [0, 1.5, 3.1, 4.8, 6.3, 7.8, 8.6], widths = [21, 20, 18.8, 19.5, 17.4, 15.8, 14.4];
  const rockGeometries: THREE.BufferGeometry[] = [];
  for (let tier = 0; tier < tiers.length - 1; tier++) {
    for (let segment = 0; segment < 7; segment++) {
      const geometry = new THREE.DodecahedronGeometry(1, 0);
      geometry.scale(widths[tier] / 7 * (0.72 + seed(tier * 21 + segment) * 0.22), (tiers[tier + 1] - tiers[tier]) * 0.9, 3.4 + seed(tier * 19 + segment) * 0.5);
      geometry.rotateY((seed(segment + tier * 62) - 0.5) * 0.6);
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        // Equal corners use equal offsets so triangles do not leave cracks.
        const corner = positions.getX(i) > 0 ? 1 : 0;
        positions.setX(i, positions.getX(i) + (seed(segment + tier * 47 + corner * 9) - 0.5) * 0.42);
      }
      geometry.translate(-24 + (segment - 3) * widths[tier] / 7 + Math.sin(tier * 2.4) * 0.7, (tiers[tier] + tiers[tier + 1]) / 2 + (seed(segment * 41 + tier) - 0.5) * 0.65, -14 + tier * -0.1 + (seed(tier * 32 + segment) - 0.5) * 0.8);
      const colour = new THREE.Color(['#797f72', '#90917b', '#777f76', '#a19d85', '#858b79', '#94957d'][tier]);
      colour.multiplyScalar(0.92 + seed(segment + tier * 37) * 0.15);
      geometry.computeBoundingBox();
      const mossColour = colour.clone().lerp(new THREE.Color('#617b51'), 0.6);
      const colours = Array.from({ length: positions.count }, (_, index) => {
        const tint = positions.getY(index) > geometry.boundingBox!.max.y - 0.28 ? mossColour : colour;
        return [tint.r, tint.g, tint.b];
      }).flat();
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); geometry.computeVertexNormals(); rockGeometries.push(geometry);
    }
  }
  const cliffGeometry = mergeGeometries(rockGeometries)!; rockGeometries.forEach(geometry => geometry.dispose());
  const cliff = new THREE.Mesh(cliffGeometry, stone); cliff.name = 'waterfall-cliff'; cliff.castShadow = true; cliff.receiveShadow = true; group.add(cliff); solids.push(cliff);
  const boulderMaterial = new THREE.MeshStandardMaterial({ color: '#8b9382', roughness: 0.95, flatShading: true });
  const boulderGeometry = new THREE.DodecahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  // Small firs above the rock face and ferns along both banks.
  const foliage = new THREE.MeshStandardMaterial({ color: '#4d7456', roughness: 1, flatShading: true });
  const treeGeometry = new THREE.ConeGeometry(1, 1, 5), trunkGeometry = new THREE.CylinderGeometry(0.09, 0.14, 1, 5);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#726047', roughness: 1 });
  for (const [x, z, height] of [[-29, -15, 3.2], [-20, -15.8, 3.7], [-25, -17.2, 2.7], [-31, -14.2, 2.2]]) {
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial); trunk.position.set(x, 8.6 + height * 0.25, z); trunk.scale.y = height * 0.5;
    const tree = new THREE.Mesh(treeGeometry, foliage); tree.position.set(x, 8.6 + height * 0.7, z); tree.scale.set(height * 0.36, height, height * 0.36);
    trunk.castShadow = true; tree.castShadow = true; group.add(trunk, tree);
  }
  const bankRocks = new THREE.InstancedMesh(boulderGeometry, boulderMaterial, 26); bankRocks.name = 'creek-bank-rocks';
  const ferns = new THREE.InstancedMesh(treeGeometry, foliage, 72); ferns.name = 'creek-ferns';
  for (let i = 0; i < 26; i++) {
    const point = creekPoint(0.12 + seed(i + 10) * 0.78), side = i % 2 ? 1 : -1;
    const offset = point.width / 2 + 0.38 + seed(i) * 0.6;
    dummy.position.set(point.x - point.dz * offset * side, 0.15, point.z + point.dx * offset * side);
    dummy.scale.set(0.3 + seed(i + 1) * 0.55, 0.22 + seed(i + 2) * 0.35, 0.4 + seed(i + 3) * 0.5); dummy.rotation.set(0.1, seed(i) * 5, 0.15); dummy.updateMatrix(); bankRocks.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < 72; i++) {
    const point = creekPoint(0.15 + seed(i + 150) * 0.58), side = i % 2 ? 1 : -1;
    const offset = point.width / 2 + 0.6 + seed(i + 44) * 1.3;
    dummy.position.set(point.x - point.dz * offset * side, 0.22, point.z + point.dx * offset * side);
    dummy.scale.set(0.15, 0.4 + seed(i) * 0.3, 0.19); dummy.rotation.set(side * 0.35, seed(i) * 6, side * 0.35); dummy.updateMatrix(); ferns.setMatrixAt(i, dummy.matrix);
  }
  group.add(bankRocks, ferns);

  // One channel shape connects the plunge pool to the existing lake surface.
  const banks = creekPath.map((point, i) => {
    const previous = creekPath[Math.max(0, i - 1)], next = creekPath[Math.min(creekPath.length - 1, i + 1)];
    const length = Math.hypot(next.x - previous.x, next.z - previous.z), nx = -(next.z - previous.z) / length, nz = (next.x - previous.x) / length;
    const extension = i === 0 ? -0.35 : i === creekPath.length - 1 ? 0.35 : 0;
    return { point: { ...point, x: point.x + (next.x - previous.x) / length * extension, z: point.z + (next.z - previous.z) / length * extension }, nx, nz };
  });
  const shape = new THREE.Shape();
  const outline = [...banks.map(({ point, nx, nz }) => [point.x + nx * point.width / 2, -(point.z + nz * point.width / 2)]), ...banks.slice().reverse().map(({ point, nx, nz }) => [point.x - nx * point.width / 2, -(point.z - nz * point.width / 2)])];
  outline.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)); shape.closePath();
  const river = createWaterSurface(new THREE.ShapeGeometry(shape), 0, 0.11, 0, 'creek'); group.add(river.tint, river.reflection);
  river.tint.material.color.set('#459d98'); river.tint.material.opacity = 0.38;

  // The curtain widens and falls forward into the pool, with procedural whitewater.
  const curtainGeometry = new THREE.PlaneGeometry(1, 1, 18, 48);
  const curtainPositions = curtainGeometry.getAttribute('position'), uv = curtainGeometry.getAttribute('uv');
  for (let i = 0; i < curtainPositions.count; i++) {
    const height = uv.getY(i), across = uv.getX(i) - 0.5;
    curtainPositions.setXYZ(i, -24 + across * (3.1 + (1 - height) * 0.7), 0.18 + height * 8.42, -10.2 + Math.pow(1 - height, 2) * 1.6 + Math.sin(across * 18) * 0.07);
  }
  curtainGeometry.computeVertexNormals();
  const timeUniform = { value: 0 };
  const curtainMaterial = new THREE.MeshStandardMaterial({ color: '#b0d9ce', roughness: 0.35, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  curtainMaterial.onBeforeCompile = shader => {
    shader.uniforms.flowTime = timeUniform;
    shader.vertexShader = `varying vec2 waterfallUv; uniform float flowTime;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        waterfallUv = uv; transformed.x += sin(uv.y * 24.0 + uv.x * 15.0 + flowTime * 3.0) * 0.035;`);
    shader.fragmentShader = `varying vec2 waterfallUv; uniform float flowTime;\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', `#include <color_fragment>
        float streams = sin(waterfallUv.x * 87.0 + sin(waterfallUv.x * 23.0) + sin(waterfallUv.y * 17.0 + flowTime * 4.0) * 0.7);
        float tumbling = sin(waterfallUv.y * 73.0 + flowTime * 13.0 + sin(waterfallUv.x * 21.0) * 6.0);
        float foam = smoothstep(-0.3, 0.8, streams) * 0.65 + smoothstep(0.6, 0.95, tumbling) * 0.35;
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.62, vec3(0.92, 0.97, 0.93), foam);`);
  };
  const curtain = new THREE.Mesh(curtainGeometry, curtainMaterial); curtain.name = 'waterfall-curtain'; group.add(curtain);
  const focus = new THREE.Object3D(); focus.name = 'waterfall-focus'; focus.position.set(-24, 4.3, -9.8); group.add(focus);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.09, 3.3), curtainMaterial); lip.position.set(-24, 8.58, -11.7); lip.name = 'waterfall-source'; group.add(lip);
  const foamMaterial = new THREE.MeshStandardMaterial({ color: '#e1eee1', roughness: 0.7, transparent: true, opacity: 0.76, depthWrite: false });
  const foam = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), foamMaterial, 54); foam.name = 'creek-flow-foam'; foam.frustumCulled = false; foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(foam);
  const ringGeometry = new THREE.RingGeometry(0.92, 1, 32);
  const poolRings = Array.from({ length: 3 }, (_, index) => {
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#dcece0', transparent: true, opacity: 0.3, depthWrite: false }));
    ring.name = `plunge-pool-ring-${index}`; ring.rotation.x = -Math.PI / 2; ring.position.set(-24, 0.14 + index * 0.001, -8.3); group.add(ring); return ring;
  });
  const sprayMaterial = new THREE.MeshStandardMaterial({ color: '#d4e9dc', roughness: 0.65, transparent: true, opacity: 0.48, depthWrite: false });
  const spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), sprayMaterial, 40); spray.name = 'waterfall-spray'; spray.frustumCulled = false; spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(spray);
  const modulo = (n: number) => ((n % 1) + 1) % 1;
  return {
    group, solids, river, focus,
    update(time: number, filter: string, daylight: number) {
      timeUniform.value = time; river.update(time, filter, daylight);
      poolRings.forEach((ring, index) => {
        const age = modulo(time * 0.55 + index / 3), radius = 0.3 + age * 1.65;
        ring.scale.set(radius * 1.4, radius, 1); ring.material.opacity = (1 - age) * 0.35;
      });
      for (let i = 0; i < 54; i++) {
        const progress = modulo(time * 0.085 + seed(i + 200)), point = creekPoint(progress);
        const offset = (seed(i + 90) - 0.5) * point.width * 0.7;
        dummy.position.set(point.x - point.dz * offset, 0.135, point.z + point.dx * offset);
        dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(-point.dz, point.dx));
        dummy.scale.set(0.18 + seed(i + 50) * 0.32, 0.04 + seed(i + 31) * 0.045, 1); dummy.updateMatrix(); foam.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < 40; i++) {
        const age = modulo(time * (0.6 + seed(i) * 0.3) + seed(i + 260));
        const angle = seed(i + 220) * Math.PI * 2, radius = 0.2 + age * (0.6 + seed(i) * 0.8);
        dummy.position.set(-24 + Math.cos(angle) * radius * 1.4, 0.18 + Math.sin(age * Math.PI) * (0.4 + seed(i + 61) * 1.2), -8.5 + Math.sin(angle) * radius);
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.025 + (1 - age) * 0.07); dummy.updateMatrix(); spray.setMatrixAt(i, dummy.matrix);
      }
      foam.instanceMatrix.needsUpdate = true; spray.instanceMatrix.needsUpdate = true;
    },
  };
}

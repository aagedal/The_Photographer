import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// A translucent tint over submerged geometry, plus a rippled planar reflection.
// Both use absolute simulation time so exposure sampling can rewind safely.
export function createWaterSurface(geometry: THREE.BufferGeometry, x: number, y: number, z: number, name: string) {
  const tint = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: '#609b8c', roughness: 0.3, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false,
  }));
  tint.name = `${name}-water`; tint.rotation.x = -Math.PI / 2; tint.position.set(x, y, z);
  const reflection = new Reflector(geometry, {
    textureWidth: 512, textureHeight: 512, multisample: 0, clipBias: 0.003,
    shader: {
      name: 'RippledWaterReflection',
      uniforms: {
        color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
        time: { value: 0 }, polarization: { value: 1 }, daylight: { value: 1 },
      },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 reflectionUv; varying vec3 worldPosition;
        void main() {
          reflectionUv = textureMatrix * vec4(position, 1.0);
          worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time, polarization, daylight;
        varying vec4 reflectionUv; varying vec3 worldPosition;
        void main() {
          vec2 p = worldPosition.xz;
          float a = p.x * 1.8 + p.y * 0.9 + time * 0.7;
          float b = p.x * -0.8 + p.y * 2.5 - time * 1.1;
          vec2 slope = vec2(cos(a) * 0.035 - cos(b) * 0.02, cos(a) * 0.018 + cos(b) * 0.04);
          vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
          float facing = clamp(dot(normalize(cameraPosition - worldPosition), normal), 0.0, 1.0);
          float fresnel = 0.12 + 0.76 * pow(1.0 - facing, 3.0);
          vec2 uv = reflectionUv.xy / reflectionUv.w + slope * 0.055;
          vec3 reflected = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb * vec3(0.9, 0.98, 0.96);
          float shimmer = pow(max(0.0, sin(a) * sin(b)), 18.0) * daylight * 0.12;
          gl_FragColor = vec4(reflected + shimmer, fresnel * polarization);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  reflection.name = `${name}-reflection`; reflection.rotation.x = -Math.PI / 2; reflection.position.set(x, y + 0.006, z);
  const material = reflection.material as THREE.ShaderMaterial;
  material.transparent = true; material.depthWrite = false; reflection.renderOrder = 2;
  return {
    tint, reflection,
    update(time: number, filter: string, daylight: number) {
      material.uniforms.time.value = time;
      material.uniforms.polarization.value = filter === 'cpl' ? 0.12 : 1;
      material.uniforms.daylight.value = daylight;
    },
  };
}

// Reflectors must not recursively render one another or reuse an active texture.
// Limit each surface to a single reflected scene pass, including the window.
export function isolateReflections(reflectors: Reflector[]) {
  for (const reflector of reflectors) {
    const renderReflection = reflector.onBeforeRender;
    reflector.onBeforeRender = function (...args) {
      const visibility = reflectors.map(surface => surface.visible);
      reflectors.forEach(surface => { if (surface !== reflector) surface.visible = false; });
      try { renderReflection.apply(this, args); }
      finally { reflectors.forEach((surface, index) => { surface.visible = visibility[index]; }); }
    };
  }
}

export function createFishSchool(x: number, surfaceY: number, z: number, radiusX: number, radiusZ: number, count: number, name: string) {
  const group = new THREE.Group(); group.name = `${name}-fish`; group.position.set(x, surfaceY, z);
  const bodyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const finGeometry = new THREE.ConeGeometry(1, 1, 3);
  const bodyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
  const finMaterial = new THREE.MeshStandardMaterial({ color: '#6a8070', roughness: 0.85, flatShading: true });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#243b34' });
  // Four instanced draw calls per school, regardless of its number of fish.
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, count);
  const fins = new THREE.InstancedMesh(finGeometry, finMaterial, count * 3);
  const eyes = new THREE.InstancedMesh(bodyGeometry, eyeMaterial, count * 2);
  const tails = new THREE.InstancedMesh(finGeometry, finMaterial, count);
  for (const mesh of [bodies, fins, eyes, tails]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Cover the entire swim path, including fins, for culling and autofocus rays.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.55, 0), Math.max(radiusX, radiusZ) + 1);
    group.add(mesh);
  }
  const shape = (position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
    const part = new THREE.Object3D(); part.position.set(...position); part.scale.set(...scale); part.rotation.set(...rotation); part.updateMatrix(); return part.matrix;
  };
  const bodyShape = shape([0, 0, 0], [0.38, 0.13, 0.12]);
  const finShapes = [shape([-0.06, 0.14, 0], [0.15, 0.13, 0.035]), ...[-1, 1].map(side => shape([0.02, -0.02, side * 0.14], [0.09, 0.16, 0.025], [side * 0.7, 0, 0]))];
  const eyeShapes = [-1, 1].map(side => shape([0.23, 0.035, side * 0.087], [0.023, 0.023, 0.023]));
  const tailShape = shape([-0.14, 0, 0], [0.19, 0.28, 0.055], [0, 0, -Math.PI / 2]);
  const matrix = new THREE.Matrix4();
  const fish = Array.from({ length: count }, (_, index) => {
    const root = new THREE.Group(); root.name = `${name}-fish-${index}`; group.add(root);
    const size = 0.8 + (index % 3) * 0.15; root.scale.setScalar(size);
    bodies.setColorAt(index, new THREE.Color(['#cfb572', '#a98755', '#83a19a'][index % 3]));
    const tail = new THREE.Group(); tail.position.x = -0.3; root.add(tail);
    return { root, tail };
  });
  return {
    group,
    update(time: number) {
      fish.forEach(({ root, tail }, index) => {
        const speed = 0.18 + (index % 3) * 0.015;
        const angle = time * speed + index * Math.PI * 2 / count;
        const rx = radiusX * (0.78 + (index % 3) * 0.08), rz = radiusZ * (0.8 + (index % 2) * 0.12);
        root.position.set(Math.cos(angle) * rx, -0.42 - (index % 3) * 0.13 + Math.sin(time * 0.8 + index) * 0.045, Math.sin(angle) * rz);
        root.rotation.y = -Math.atan2(Math.cos(angle) * rz, -Math.sin(angle) * rx);
        tail.rotation.y = Math.sin(time * 5 + index * 1.9) * 0.35;
        root.updateMatrix(); tail.updateMatrix();
        bodies.setMatrixAt(index, matrix.multiplyMatrices(root.matrix, bodyShape));
        finShapes.forEach((shape, part) => fins.setMatrixAt(index * 3 + part, matrix.multiplyMatrices(root.matrix, shape)));
        eyeShapes.forEach((shape, part) => eyes.setMatrixAt(index * 2 + part, matrix.multiplyMatrices(root.matrix, shape)));
        tails.setMatrixAt(index, matrix.multiplyMatrices(root.matrix, tail.matrix).multiply(tailShape));
      });
      for (const mesh of [bodies, fins, eyes, tails]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

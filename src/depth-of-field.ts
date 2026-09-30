import * as THREE from 'three';
import { blurScale } from './optics.ts';
import { gradientPosition, type FilterId } from './filters.ts';

export interface PhotoOptics { aperture: number; focalLength: number; focusDistance: number; filter?: FilterId; gradPosition?: number }

export const fullscreenVertex = `varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createDepthOfFieldMaterial(image: THREE.Texture, depth: THREE.DepthTexture, width: number, height: number) {
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      image: { value: image }, depth: { value: depth }, texel: { value: new THREE.Vector2(1 / width, 1 / height) },
      near: { value: 0.1 }, far: { value: 450 }, focus: { value: 10 }, scale: { value: 0 }, maxRadius: { value: 24 * height / 600 },
      gradientStrength: { value: 0 }, gradientPosition: { value: 0.5 }, sensorCropY: { value: 1 },
    },
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D image; uniform sampler2D depth; uniform vec2 texel;
      uniform float near; uniform float far; uniform float focus; uniform float scale; uniform float maxRadius;
      uniform float gradientStrength; uniform float gradientPosition; uniform float sensorCropY;
      vec4 filteredImage(vec2 uv) {
        float imageY = (0.5 - uv.y) / sensorCropY + 0.5;
        float stops = gradientStrength * (1.0 - smoothstep(gradientPosition - 0.15, gradientPosition + 0.15, imageY));
        vec4 color = texture2D(image, uv); color.rgb *= exp2(-stops); return color;
      }
      float distanceAt(vec2 uv) {
        float z = texture2D(depth, uv).x;
        return near * far / (far - z * (far - near));
      }
      float coc(float z) { return min(maxRadius, scale * abs(1.0 - focus / z)); }
      void main() {
        float z = distanceAt(vUv);
        float radius = coc(z);
        vec4 color = filteredImage(vUv);
        if (radius < 0.35) { gl_FragColor = color; return; }
        float weight = 1.0;
        // A disk kernel, measured in pixels rather than UVs, keeps bokeh round.
        for (int i = 0; i < 48; i++) {
          float r = sqrt((float(i) + 0.5) / 48.0);
          float angle = float(i) * 2.39996323;
          vec2 uv = clamp(vUv + vec2(cos(angle), sin(angle)) * r * radius * texel, texel * 0.5, vec2(1.0) - texel * 0.5);
          float sampleZ = distanceAt(uv);
          // Do not drag a sharp foreground subject into a defocused background.
          float w = sampleZ < z - max(0.1, z * 0.02) ? smoothstep(radius * 0.5, radius, coc(sampleZ)) : 1.0;
          color += filteredImage(uv) * w;
          weight += w;
        }
        gl_FragColor = color / weight;
      }`,
  });
  return {
    material,
    update(camera: THREE.PerspectiveCamera, optics: PhotoOptics, width: number, height: number) {
      material.uniforms.texel.value.set(1 / width, 1 / height);
      material.uniforms.near.value = camera.near; material.uniforms.far.value = camera.far;
      const focus = Math.max(optics.focalLength / 1000 + 0.01, optics.focusDistance);
      material.uniforms.focus.value = focus;
      // The live view includes the area outside the centered 3:2 sensor crop.
      const crop = Math.min(1, camera.aspect / 1.5), sensorHeight = 24 / crop;
      material.uniforms.scale.value = blurScale(optics.focalLength, optics.aperture, focus, height, sensorHeight);
      material.uniforms.maxRadius.value = 24 * height * crop / 600;
      material.uniforms.gradientStrength.value = optics.filter === 'gnd3' ? 3 : 0;
      material.uniforms.gradientPosition.value = gradientPosition(optics.gradPosition);
      material.uniforms.sensorCropY.value = crop;
    },
  };
}

export function createFinishMaterial(image: THREE.Texture) {
  return new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { image: { value: image }, toneMappingExposure: { value: 1 } },
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv; uniform sampler2D image;
      #include <tonemapping_pars_fragment>
      void main() { gl_FragColor = sRGBTransferOETF(vec4(ACESFilmicToneMapping(texture2D(image, vUv).rgb), 1.0)); }`,
  });
}

export function createViewfinderRenderer() {
  const source = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  source.depthTexture = new THREE.DepthTexture(1, 1);
  const blurred = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const dof = createDepthOfFieldMaterial(source.texture, source.depthTexture, 1, 1);
  const finish = createFinishMaterial(blurred.texture);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dof.material);
  const scene = new THREE.Scene(); scene.add(quad);
  const screenCamera = new THREE.Camera();
  const size = new THREE.Vector2();
  return {
    render(renderer: THREE.WebGLRenderer, world: THREE.Scene, camera: THREE.PerspectiveCamera, optics: PhotoOptics) {
      renderer.getDrawingBufferSize(size);
      if (source.width !== size.x || source.height !== size.y) {
        source.setSize(size.x, size.y); blurred.setSize(size.x, size.y);
      }
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      try {
        renderer.autoClear = true;
        renderer.setRenderTarget(source); renderer.render(world, camera);
        dof.update(camera, optics, size.x, size.y);
        quad.material = dof.material;
        renderer.setRenderTarget(blurred); renderer.render(scene, screenCamera);
        finish.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
        quad.material = finish;
        renderer.setRenderTarget(previousTarget); renderer.render(scene, screenCamera);
      } finally {
        renderer.setRenderTarget(previousTarget); renderer.autoClear = previousAutoClear;
      }
    },
    dispose() { source.dispose(); blurred.dispose(); dof.material.dispose(); finish.dispose(); quad.geometry.dispose(); },
  };
}

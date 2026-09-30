import * as THREE from 'three';
import { createDepthOfFieldMaterial, createFinishMaterial, fullscreenVertex, type PhotoOptics } from './depth-of-field.ts';

// Accumulate linear light on the GPU, then tone-map and read back only once.
// This avoids averaging already-clipped highlights or copying every frame to JS.
export function createPhotoRenderer(width = 900, height = 600) {
  const target = () => new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });
  const sample = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  sample.depthTexture = new THREE.DepthTexture(width, height);
  const blurred = target();
  const dof = createDepthOfFieldMaterial(sample.texture, sample.depthTexture, width, height);
  const history = [target(), target()];
  const output = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false });
  const blend = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { previous: { value: history[0].texture }, current: { value: blurred.texture }, weight: { value: 1 } },
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv; uniform sampler2D previous; uniform sampler2D current; uniform float weight;
      void main() { gl_FragColor = mix(texture2D(previous, vUv), texture2D(current, vUv), weight); }`,
  });
  const finish = createFinishMaterial(history[0].texture);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blend);
  const scene = new THREE.Scene(); scene.add(quad);
  const camera = new THREE.Camera();
  const pixels = new Uint8Array(width * height * 4);
  return {
    render(renderer: THREE.WebGLRenderer, count: number, photoCamera: THREE.PerspectiveCamera, optics: PhotoOptics, renderSample: (index: number) => void): HTMLCanvasElement {
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      try {
        renderer.autoClear = true;
        quad.material = blend;
        // Initialize both history buffers so a first blend cannot read stale/NaN data.
        for (const buffer of history) { renderer.setRenderTarget(buffer); renderer.clear(); }
        for (let i = 0; i < count; i++) {
          renderer.setRenderTarget(sample); renderSample(i);
          // Blur each scene sample using its own depth before averaging motion.
          dof.update(photoCamera, optics, width, height); quad.material = dof.material;
          renderer.setRenderTarget(blurred); renderer.render(scene, camera);
          quad.material = blend;
          blend.uniforms.previous.value = history[i % 2].texture;
          blend.uniforms.weight.value = 1 / (i + 1);
          renderer.setRenderTarget(history[(i + 1) % 2]); renderer.render(scene, camera);
        }
        finish.uniforms.image.value = history[count % 2].texture;
        finish.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
        quad.material = finish;
        renderer.setRenderTarget(output); renderer.render(scene, camera);
        renderer.readRenderTargetPixels(output, 0, 0, width, height, pixels);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const image = ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) image.data.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), (height - y - 1) * width * 4);
        ctx.putImageData(image, 0, 0);
        return canvas;
      } finally {
        renderer.setRenderTarget(previousTarget); renderer.autoClear = previousAutoClear;
      }
    },
    dispose() { sample.dispose(); blurred.dispose(); history.forEach(buffer => buffer.dispose()); output.dispose(); dof.material.dispose(); blend.dispose(); finish.dispose(); quad.geometry.dispose(); },
  };
}

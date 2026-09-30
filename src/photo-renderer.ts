import * as THREE from 'three';

// Accumulate linear light on the GPU, then tone-map and read back only once.
// This avoids averaging already-clipped highlights or copying every frame to JS.
export function createPhotoRenderer(width = 900, height = 600) {
  const target = () => new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });
  const sample = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const history = [target(), target()];
  const output = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false });
  const vertexShader = `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const blend = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { previous: { value: history[0].texture }, current: { value: sample.texture }, weight: { value: 1 } },
    vertexShader,
    fragmentShader: `varying vec2 vUv; uniform sampler2D previous; uniform sampler2D current; uniform float weight;
      void main() { gl_FragColor = mix(texture2D(previous, vUv), texture2D(current, vUv), weight); }`,
  });
  const finish = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { image: { value: history[0].texture }, toneMappingExposure: { value: 1 } },
    vertexShader,
    fragmentShader: `varying vec2 vUv; uniform sampler2D image;
      #include <tonemapping_pars_fragment>
      void main() { gl_FragColor = sRGBTransferOETF(vec4(ACESFilmicToneMapping(texture2D(image, vUv).rgb), 1.0)); }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blend);
  const scene = new THREE.Scene(); scene.add(quad);
  const camera = new THREE.Camera();
  const pixels = new Uint8Array(width * height * 4);
  return {
    render(renderer: THREE.WebGLRenderer, count: number, renderSample: (index: number) => void): HTMLCanvasElement {
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      try {
        renderer.autoClear = true;
        quad.material = blend;
        // Initialize both history buffers so a first blend cannot read stale/NaN data.
        for (const buffer of history) { renderer.setRenderTarget(buffer); renderer.clear(); }
        for (let i = 0; i < count; i++) {
          renderer.setRenderTarget(sample); renderSample(i);
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
  };
}

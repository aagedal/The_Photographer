import * as THREE from 'three';

// Celestial discs use the same camera rotation and infinite depth as the sky.
// Ignoring camera translation removes parallax even at the map's outer edges.
export function createCelestialDisc(name: string, colour: string, radius: number) {
  const material = new THREE.ShaderMaterial({
    depthWrite: false, toneMapped: false,
    uniforms: { colour: { value: new THREE.Color(colour) } },
    vertexShader: `void main() {
      vec3 skyPosition=(modelMatrix*vec4(position,1.0)).xyz;
      vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*skyPosition,1.0);
      gl_Position=clip.xyww;
    }`,
    fragmentShader: `uniform vec3 colour;
      void main() { gl_FragColor=vec4(colour,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),material);
  disc.name=name; disc.frustumCulled=false; disc.renderOrder=-999;
  return disc;
}

/** A horizon gradient and soft solar halo, shared by live view and photographs. */
export function createSkyDome(scene: THREE.Scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      zenith: {value:new THREE.Color()}, horizon: {value:new THREE.Color()},
      sunDirection: {value:new THREE.Vector3()}, solarColour: {value:new THREE.Color('#ffe2b5')}, solarStrength: {value:0},
    },
    vertexShader: `varying vec3 skyDirection;
      void main() { skyDirection=position; vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0); gl_Position=clip.xyww; }`,
    fragmentShader: `varying vec3 skyDirection;
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDirection; uniform vec3 solarColour; uniform float solarStrength;
      void main() {
        vec3 direction=normalize(skyDirection);
        float height=pow(max(0.0,direction.y),0.6);
        vec3 colour=mix(horizon,zenith,height);
        float facing=max(0.0,dot(direction,sunDirection));
        colour+=solarColour*(pow(facing,16.0)*0.14+pow(facing,180.0)*0.28)*solarStrength;
        gl_FragColor=vec4(colour,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome=new THREE.Mesh(new THREE.SphereGeometry(850,32,16),material);dome.name='atmospheric-sky';dome.frustumCulled=false;dome.renderOrder=-1000;scene.add(dome);
  const night=new THREE.Color('#0b1428'),day=new THREE.Color('#78b4cd'),dusk=new THREE.Color('#b78394');
  return {
    setTime(daylight:number,warmth:number,horizon:THREE.Color,sun:readonly [number,number,number]) {
      material.uniforms.zenith.value.copy(night).lerp(day,daylight).lerp(dusk,warmth*0.35);
      material.uniforms.horizon.value.copy(horizon);
      material.uniforms.sunDirection.value.set(...sun).normalize();
      material.uniforms.solarStrength.value=daylight*(0.5+warmth*0.5);
    },
  };
}

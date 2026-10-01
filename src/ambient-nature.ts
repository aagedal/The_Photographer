import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { coastline, distanceToTrail, terrainHeight } from './terrain.ts';
import { creekDistance } from './creek.ts';
import { regionalLandmarks } from './landmarks.ts';
import { isActiveHour } from './life.ts';
import { partitionScenery } from './scenery-batches.ts';
import { partitionGrass, GRASS_REFERENCE_PROJECTION } from './grass-detail.ts';

const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;

export function createAmbientNature(scene: THREE.Scene, canWalk: (x: number, z: number) => boolean) {
  const group = new THREE.Group(); group.name = 'ambient-nature'; scene.add(group);
  const dummy = new THREE.Object3D();
  const wind = { value: 0 };
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
  grassMaterial.onBeforeCompile = shader => {
    shader.uniforms.natureTime = wind;
    shader.vertexShader = 'uniform float natureTime;\nattribute float grassRank;\nvarying float grassCoverage;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 meadowOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float gust = sin(natureTime * 1.3 + meadowOrigin.x * 0.19 + meadowOrigin.z * 0.13);
      transformed.x += gust * position.y * position.y * 0.10;
      transformed.z += sin(natureTime * 0.9 + meadowOrigin.z * 0.22) * position.y * position.y * 0.05;
      float grassDistance = length((modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz)
        * ${GRASS_REFERENCE_PROJECTION.toFixed(8)} / max(0.001, projectionMatrix[1][1]);
      float density = (1.0 - smoothstep(18.0, 42.0, grassDistance)) * 0.65
        + (1.0 - smoothstep(42.0, 80.0, grassDistance)) * 0.25
        + (1.0 - smoothstep(80.0, 120.0, grassDistance)) * 0.1;
      grassCoverage = density <= 0.0 ? 0.0 : smoothstep(grassRank - 0.03, grassRank + 0.03, density);`);
    shader.fragmentShader = 'varying float grassCoverage;\n' + shader.fragmentShader;
    // Screen-door coverage avoids transparent layers and softens density changes.
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float grassDither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      if (grassCoverage <= grassDither) discard;`);
  };
  grassMaterial.customProgramCacheKey = () => 'meadow-wind-detail-v2';
  // Three tapered blades per tuft, sharing one instanced draw call.
  const bladeVertices: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    for (const [x, y] of [[-0.08,0],[0.08,0],[-0.045,0.55],[0.08,0], [0.045,0.55],[-0.045,0.55],[-0.045,0.55],[0.045,0.55],[0.02,1]]) bladeVertices.push(x*c,y,x*s);
  }
  const grassGeometry = new THREE.BufferGeometry(); grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bladeVertices,3)); grassGeometry.computeVertexNormals();
  const sites: [number, number][] = [];
  // Keep pavement, buildings, water and assignment sightlines clear. Plants
  // are decorative and never introduce hidden collision boxes on walking routes.
  for (let i = 0; i < 60000 && sites.length < 19500; i++) {
    const x = i < 7200 ? -86 + seed(i + 8200) * 35 : i < 11400 ? 52 + seed(i + 8200) * 38 : -215 + seed(i + 8200) * 430;
    const z = i < 7200 ? 36 + seed(i + 19200) * 32 : i < 11400 ? -25 + seed(i + 19200) * 52 : -220 + seed(i + 19200) * 310;
    const town = x > -46 && x < 58 && z > -42 && z < 79;
    if (town || z > coastline(x)-13 || terrainHeight(x,z)<0 || distanceToTrail(x,z)<2.6 || creekDistance(x,z)<3 || !canWalk(x,z)) continue;
    if (Math.hypot((x-76)/17,(z+54)/14)<1 || regionalLandmarks.some(p=>Math.hypot(x-p.x,z-p.z)<22)) continue;
    sites.push([x,z]);
  }
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, sites.length); grass.name = 'wind-meadow-grass'; grass.receiveShadow = true;
  const colour = new THREE.Color();
  sites.forEach(([x,z],i) => {
    dummy.position.set(x,terrainHeight(x,z)-0.035,z); dummy.rotation.set(0,seed(i+93)*TAU,0);
    const size = 0.12+seed(i+85)*0.23; dummy.scale.set(0.7+seed(i)*0.8,size,0.7+seed(i)*0.8); dummy.updateMatrix(); grass.setMatrixAt(i,dummy.matrix);
    colour.set(i%3===0?'#b5ad71':i%3===1?'#77945a':'#8fa766'); grass.setColorAt(i,colour);
  });
  group.add(partitionGrass(grass));
  const shrub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),180);
  shrub.name='woodland-understory'; shrub.receiveShadow=true; shrub.castShadow=true;
  for (let i=0;i<180;i++) {
    const offset=Math.floor(sites.length*0.55);
    const [x,z]=sites[offset+(i*31)%(sites.length-offset)], size=0.35+seed(i+73)*0.6;
    dummy.position.set(x,terrainHeight(x,z)+size*0.35,z); dummy.rotation.set(0,seed(i)*TAU,0); dummy.scale.set(size,size*0.65,size*0.85); dummy.updateMatrix(); shrub.setMatrixAt(i,dummy.matrix);
    colour.set(i%3===0?'#88925b':'#6b875b'); shrub.setColorAt(i,colour);
  }
  group.add(partitionScenery(shrub, 48));
  // Dense, intentional flower patches near the lake, chapel and meadow.
  const beds = [[-18,14,3,1],[-30,28,2,2],[-50,33,3,2],[-69,56,5,3],[57,6,3,2],[12,22,2,2]];
  const flowerSites: [number,number][]=[];
  beds.forEach(([cx,cz,rx,rz],b)=>{for(let i=0;i<60;i++) {
    const a=seed(i+b*60+111)*TAU,r=Math.sqrt(seed(i+b*60+221)); const x=cx+Math.cos(a)*rx*r,z=cz+Math.sin(a)*rz*r;
    if(canWalk(x,z)&&distanceToTrail(x,z)>1.9) flowerSites.push([x,z]);
  }});
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018,0.025,1,4),grassMaterial.clone(),flowerSites.length);
  // Stems use ordinary lighting; grass's shader depends on tapered blade coordinates.
  (stems.material as THREE.MeshStandardMaterial).onBeforeCompile=()=>{};
  (stems.material as THREE.MeshStandardMaterial).color.set('#66814e');
  const petals = Array.from({length:5},(_,i)=>{
    const a=i/5*TAU,petal=new THREE.SphereGeometry(1,8,6);
    petal.scale(0.55,0.18,0.32);petal.rotateY(-a);petal.translate(Math.cos(a)*0.45,0,Math.sin(a)*0.45);return petal;
  });
  const blossomGeometry=mergeGeometries(petals)!;petals.forEach(petal=>petal.dispose());
  const centres = new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshStandardMaterial({color:'#d3a848',roughness:1}),flowerSites.length);
  centres.name='wildflower-centres';
  const blooms = new THREE.InstancedMesh(blossomGeometry,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.95}),flowerSites.length);
  stems.name='wildflower-stems'; blooms.name='wildflower-blooms'; blooms.receiveShadow=true;
  flowerSites.forEach(([x,z],i)=>{
    const h=0.2+seed(i+48)*0.3,y=terrainHeight(x,z); dummy.rotation.set(0,0,0); dummy.position.set(x,y+h/2,z); dummy.scale.set(1,h,1); dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    dummy.position.y=y+h;dummy.scale.set(0.12,0.12,0.12);dummy.updateMatrix();blooms.setMatrixAt(i,dummy.matrix);
    dummy.position.y+=0.02;dummy.scale.set(0.028,0.018,0.028);dummy.updateMatrix();centres.setMatrixAt(i,dummy.matrix);
    colour.set(['#efdab0','#d6a0a3','#aaafd0','#e7ba64'][i%4]);blooms.setColorAt(i,colour);
  });group.add(stems,blooms,centres);

  const batchAnimalParts = (animal: THREE.Group, joints: THREE.Mesh[] = []) => {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of animal.children) {
      if (!(child instanceof THREE.Mesh) || joints.includes(child) || Array.isArray(child.material)) continue;
      const meshes=batches.get(child.material) ?? []; meshes.push(child); batches.set(child.material,meshes);
    }
    for (const [material,meshes] of batches) {
      if (meshes.length<2) continue;
      const parts=meshes.map(mesh=>{mesh.updateMatrix();return (mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrix);});
      const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());
      if (!geometry) continue;
      const merged=new THREE.Mesh(geometry,material);merged.castShadow=true;
      meshes.forEach(mesh=>animal.remove(mesh));animal.add(merged);
    }
  };
  const tailMaterial = new THREE.MeshStandardMaterial({color:'#e5d7bf',roughness:1});
  const animalMaterial = new THREE.MeshStandardMaterial({color:'#a58d76',roughness:1});
  const eyeMaterial = new THREE.MeshStandardMaterial({color:'#303930',roughness:0.6});
  const ovalGeometry = new THREE.SphereGeometry(1,10,8);
  const oval=(parent:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat=animalMaterial)=>{
    const mesh=new THREE.Mesh(ovalGeometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const rabbits=Array.from({length:7},(_,i)=>{
    const rabbit=new THREE.Group();rabbit.name=`meadow-rabbit-${i}`;group.add(rabbit);
    oval(rabbit,0,0.23,0,0.18,0.22,0.3);oval(rabbit,0,0.36,0.25,0.14,0.15,0.14);
    const ears=[-1,1].map(side=>oval(rabbit,side*0.065,0.57,0.23,0.045,0.18,0.045));
    for(const side of [-1,1]) {oval(rabbit,side*0.12,0.38,0.32,0.018,0.025,0.015,eyeMaterial);oval(rabbit,side*0.13,0.08,-0.1,0.1,0.09,0.16);oval(rabbit,side*0.08,0.055,0.22,0.055,0.055,0.12);}
    oval(rabbit,0,0.25,-0.29,0.085,0.09,0.08,tailMaterial);
    const home=[[-57,43],[-62,47],[-74,61],[-81,56],[56,5],[67,12],[-49,28]][i];
    batchAnimalParts(rabbit,ears);
    return {rabbit,ears,home};
  });
  // Sculpted, tapered wings read as birds even when silhouetted against the sky.
  const wingGeometry=new THREE.BufferGeometry();wingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, 0.65,0.02,-0.03, 0.45,0,0.18, 0,0,0, 0.45,0,0.18, 0.12,0,0.16],3));wingGeometry.computeVertexNormals();
  const birdMaterial=new THREE.MeshStandardMaterial({color:'#535f5b',roughness:1,side:THREE.DoubleSide});
  const birds=Array.from({length:22},(_,i)=>{
    const bird=new THREE.Group();bird.name=`sky-bird-${i}`;group.add(bird);
    oval(bird,0,0,0,0.08,0.085,0.25,birdMaterial);oval(bird,0,0.06,0.2,0.07,0.07,0.08,birdMaterial);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group();const wing=new THREE.Mesh(wingGeometry,birdMaterial);wing.scale.x=side;pivot.add(wing);bird.add(pivot);return pivot;});
    batchAnimalParts(bird);
    bird.scale.setScalar(i<12?0.85:1.35);return {bird,wings};
  });
  const butterflyMaterial=new THREE.MeshStandardMaterial({color:'#e3b15e',side:THREE.DoubleSide,roughness:0.8});
  const butterflies=Array.from({length:16},(_,i)=>{
    const butterfly=new THREE.Group();butterfly.name=`garden-butterfly-${i}`;group.add(butterfly);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group(); const wing=new THREE.Mesh(new THREE.CircleGeometry(0.1,8),butterflyMaterial);wing.position.x=side*0.07;wing.scale.y=0.65;pivot.add(wing);butterfly.add(pivot);return pivot;});
    return {butterfly,wings};
  });
  const fireflyGeometry=new THREE.BufferGeometry();fireflyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(45*3),3));
  const fireflyMaterial=new THREE.PointsMaterial({color:'#e1ee99',size:0.085,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  fireflyMaterial.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float glowRadius=length(gl_PointCoord-vec2(0.5));
      diffuseColor.a*=1.0-smoothstep(0.12,0.5,glowRadius);
      if(glowRadius>0.5) discard;`);
  };
  const fireflies=new THREE.Points(fireflyGeometry,fireflyMaterial);fireflies.name='evening-fireflies';fireflies.frustumCulled=false;group.add(fireflies);
  return {
    update(time:number,hour:number,daylight:number) {
      wind.value=time;
      rabbits.forEach(({rabbit,ears,home},i)=>{
        const t=time+i*9,cycle=((t%18)+18)%18, moving=cycle<4;
        // Smooth short hops between grazing pauses rather than feet sliding.
        const travel=Math.floor(t/18)*0.48+Math.min(cycle,4)*0.12;
        const rx=home[0]+Math.sin(travel)*1.4,rz=home[1]+Math.cos(travel)*0.9;
        rabbit.position.set(rx,terrainHeight(rx,rz)+(moving?Math.abs(Math.sin(cycle*Math.PI*2))*0.18:0),rz);
        rabbit.rotation.set(moving?-Math.sin(cycle*Math.PI*2)*0.08:Math.sin(t*1.2)*0.035,Math.atan2(Math.cos(travel)*1.4,-Math.sin(travel)*0.9),0);
        rabbit.visible=isActiveHour(hour,5,22);ears.forEach((ear,j)=>{ear.rotation.x=Math.sin(t*0.7+j)*0.12;});
      });
      birds.forEach(({bird,wings},i)=>{
        const flock=i<12?0:1,index=flock?i-12:i,a=time*(flock?0.032:0.045)+index*0.16;
        const x=(flock?72:-24)+Math.sin(a)*(flock?35:52),z=(flock?-47:9)+Math.cos(a)*(flock?24:32);
        bird.position.set(x,24+flock*11+Math.sin(a*2+i)*2+index*0.45,z);bird.rotation.set(0,Math.atan2(Math.cos(a),-Math.sin(a)),Math.sin(a)*-0.14);
        bird.visible=isActiveHour(hour,5,21);const flap=Math.sin(time*(flock?4:6)+i*0.9)*0.55;
        wings.forEach((wing,j)=>{wing.rotation.z=(j?1:-1)*(0.08+flap);});
      });
      butterflies.forEach(({butterfly,wings},i)=>{
        const bed=beds[i%beds.length],a=time*0.7+i*2.4,x=bed[0]+Math.sin(a)*1.4,z=bed[1]+Math.cos(a*0.8)*1.1;
        butterfly.position.set(x,terrainHeight(x,z)+0.65+Math.sin(a*1.3)*0.25,z);butterfly.rotation.set(-Math.PI/2,0,-a);
        butterfly.visible=daylight>0.45;wings.forEach((wing,j)=>{wing.rotation.y=(j?1:-1)*Math.sin(time*22+i)*0.95;});
      });
      const points=fireflyGeometry.getAttribute('position');
      for(let i=0;i<points.count;i++) {const x=-20+seed(i+663)*17+Math.sin(time*0.4+i)*0.6,z=11+seed(i+734)*9+Math.cos(time*0.3+i)*0.6;points.setXYZ(i,x,terrainHeight(x,z)+0.7+seed(i+88)*1.3+Math.sin(time+i)*0.15,z);}
      points.needsUpdate=true;fireflies.visible=daylight<0.35;(fireflies.material as THREE.PointsMaterial).opacity=(1-daylight)*0.8;
    },
  };
}

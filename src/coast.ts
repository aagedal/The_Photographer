import * as THREE from 'three';
import { createWaterSurface } from './water.ts';
import { coastline, terrainHeight } from './terrain.ts';

export function createCoast(scene: THREE.Scene) {
  // The water continues beyond the walking boundary to meet the fog horizon.
  const vertices: number[] = [], indices: number[] = [];
  for (let i=0;i<=120;i++) {
    const x=-600+i*10;
    vertices.push(x,-coastline(x),0,x,-750,0);
    if (i<120) {const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ocean=createWaterSurface(geometry,0,0.11,0,'ocean');
  (ocean.tint.material as THREE.MeshPhysicalMaterial).color.set('#4e8797');
  (ocean.tint.material as THREE.MeshPhysicalMaterial).opacity=0.72;
  scene.add(ocean.tint,ocean.reflection);
  const foamMaterial=new THREE.MeshBasicMaterial({color:'#ddebe1',transparent:true,opacity:0.48,depthWrite:false,side:THREE.DoubleSide});
  const foam=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),foamMaterial,120);foam.name='ocean-surf';foam.frustumCulled=false;scene.add(foam);
  const dummy=new THREE.Object3D();
  const birds=Array.from({length:6},(_,i)=>{
    const group=new THREE.Group();group.name=`seagull-${i}`;scene.add(group);
    const material=new THREE.MeshStandardMaterial({color:'#e6e4d6',roughness:0.8,flatShading:true});
    const body=new THREE.Mesh(new THREE.IcosahedronGeometry(0.15,0),material);body.scale.set(0.8,0.8,1.8);group.add(body);
    const wings=[-1,1].map(side=>{const wing=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.035,0.17),material);wing.position.x=side*0.27;group.add(wing);return wing;});
    return {group,wings};
  });
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#8d9386',flatShading:true,roughness:1}),22);
  rocks.name='coastal-rocks';rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
  for(let i=0;i<22;i++) {
    const x=-120+i*11.4,z=coastline(x)+4+Math.sin(i*7)*3;dummy.position.set(x,0.1,z);dummy.rotation.set(0,i*1.9,0);dummy.scale.set(0.8+i%3*0.4,0.7+i%4*0.3,1.1);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  // A pale footpath joins the neighborhood to the beach overlook.
  const pathVertices:number[]=[];
  for(let i=0;i<=24;i++) {
    const z=66+i*1.2,x=49+(z-66)*0.3;
    for(const side of [-1,1]) pathVertices.push(x+side,terrainHeight(x+side,z)+0.045,z);
  }
  const pathIndices:number[]=[];for(let i=0;i<24;i++){const a=i*2;pathIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const pathGeo=new THREE.BufferGeometry();pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(pathVertices,3));pathGeo.setIndex(pathIndices);pathGeo.computeVertexNormals();
  const path=new THREE.Mesh(pathGeo,new THREE.MeshStandardMaterial({color:'#cbbb96',roughness:1,side:THREE.DoubleSide}));path.receiveShadow=true;scene.add(path);
  const beachProps = new THREE.Group(); beachProps.name='beach-overlook';scene.add(beachProps);
  const propMaterial = new THREE.MeshStandardMaterial({color:'#9b815d',roughness:1,flatShading:true});
  const block=(x:number,y:number,z:number,w:number,h:number,d:number)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),propMaterial);mesh.position.set(x,terrainHeight(x,z)+y,z);mesh.castShadow=true;mesh.receiveShadow=true;beachProps.add(mesh);return mesh;
  };
  block(62,0.7,89,2.5,0.14,0.75);block(62,1.05,88.7,2.5,0.65,0.12);
  for(const x of [61.1,62.9]) block(x,0.35,89,0.13,0.7,0.6);
  block(52,1.2,91,0.14,2.4,0.14);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.1,6,12),new THREE.MeshStandardMaterial({color:'#c98659',roughness:0.8}));ring.position.set(52,terrainHeight(52,91)+1.6,91.15);beachProps.add(ring);
  for(let i=0;i<8;i++) {
    const x=35+i*6,z=coastline(x)-4-(i%3);const log=block(x,0.15,z,1.4,0.2,0.22);log.rotation.y=i*0.7;
    for(let j=0;j<3;j++) {
      const blade=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.5+j*0.12,0.06),new THREE.MeshStandardMaterial({color:'#83966a',roughness:1}));
      blade.position.set(x+0.8+j*0.14,terrainHeight(x+0.8,z-2)+0.3,z-2);blade.rotation.z=(j-1)*0.3;beachProps.add(blade);
    }
  }
  return {
    reflection:ocean.reflection,
    update(time:number,filter:string,daylight:number) {
      ocean.update(time,filter,daylight);foamMaterial.opacity=0.15+daylight*0.32;
      for(let i=0;i<120;i++) {
        const x=-150+(i%40)*7.7,phase=((time*0.15+Math.floor(i/40)*0.33)%1+1)%1;
        dummy.position.set(x,0.14,coastline(x)+1+(1-phase)*10);dummy.rotation.set(-Math.PI/2,0,0.025*Math.sin(i));dummy.scale.set(4.5+Math.sin(i)*1.8,0.08+Math.sin(phase*Math.PI)*0.25,1);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);
      }
      foam.instanceMatrix.needsUpdate=true;
      birds.forEach((bird,i)=>{
        const angle=time*0.12+i;
        bird.group.position.set(55+Math.sin(angle)*17,7+Math.sin(angle*2+i)*2,coastline(55)+7+Math.cos(angle)*9);
        bird.group.rotation.y=Math.atan2(Math.cos(angle),-Math.sin(angle));bird.group.rotation.z=Math.sin(angle)*0.12;
        bird.wings.forEach((wing,j)=>{wing.rotation.z=Math.sin(time*5+i)*0.28*(j?1:-1);});
      });
    },
  };
}

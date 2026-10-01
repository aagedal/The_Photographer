import * as THREE from 'three';
import { woodlandCabins } from './world-layout.ts';
import { terrainHeight } from './terrain.ts';
import { gabledRoof } from './building-surfaces.ts';

export function createWoodlandPlaces(scene: THREE.Scene, solids: THREE.Object3D[]) {
  const blockers: {x:number;z:number;w:number;d:number}[] = [];
  const cube = new THREE.BoxGeometry(1,1,1);
  const materials = new Map<string,THREE.MeshStandardMaterial>();
  for (const cabin of woodlandCabins) {
    const group = new THREE.Group(); group.name=cabin.id;
    group.position.set(cabin.x,terrainHeight(cabin.x,cabin.z),cabin.z); scene.add(group);
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,solid=false)=>{
      if (!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:0.9}));
      const mesh=new THREE.Mesh(cube,materials.get(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
      if(solid){solids.push(mesh);blockers.push({x:cabin.x+x,z:cabin.z+z,w,d});}
      return mesh;
    };
    box(0,-0.15,0,7.3,0.4,7.3,'#9b9582');
    box(0,0.05,0,7,0.1,7,'#b39871');
    box(0,1.65,-3.5,7,3.3,0.2,'#8e775a',true);
    for(const x of [-3.5,3.5]) box(x,1.65,0,0.2,3.3,7,'#8e775a',true);
    for(const x of [-2.25,2.25]) box(x,1.65,3.5,2.5,3.3,0.2,'#8e775a',true);
    box(0,2.95,3.5,2,0.7,0.2,'#8e775a');
    const roof=new THREE.Mesh(gabledRoof(7.8,7.8,1.7),new THREE.MeshStandardMaterial({color:'#526a5d',roughness:0.9,side:THREE.DoubleSide}));roof.position.y=3.3;roof.castShadow=true;group.add(roof);
    const gables=new THREE.BufferGeometry();
    gables.setAttribute('position',new THREE.Float32BufferAttribute([-3.5,0,3.5,3.5,0,3.5,0,1.7,3.5,3.5,0,-3.5,-3.5,0,-3.5,0,1.7,-3.5],3));gables.computeVertexNormals();
    const gable=new THREE.Mesh(gables,materials.get('#8e775a'));gable.position.y=3.3;gable.castShadow=true;group.add(gable);
    box(0,0.05,4.4,3,0.1,1.8,'#b39871');
    box(-2.3,0.45,-1.8,1.5,0.7,2.5,'#7f6b53',true);
    box(-2.3,0.86,-1.8,1.45,0.15,2.4,'#a4ac8a');
    box(2.3,0.85,-1.8,1.5,0.15,1.2,'#ad9270',true);
    for(const x of [1.75,2.85]) box(x,0.42,-1.8,0.1,0.85,0.9,'#7f6b53');
    box(2.25,0.95,-1.6,0.65,0.06,0.45,'#e3d6b8'); // Trail guestbook.
    box(-2.2,1.8,3.62,1.3,0.8,0.07,'#aec4b1');
    box(-2.2,1.8,3.68,0.06,0.85,0.06,'#eee1be');
    box(-2.2,1.8,3.68,1.35,0.06,0.06,'#eee1be');
    // A split-log seat and woodpile make the clearing worth a quiet visit.
    box(4.6,0.5,1.5,1.2,0.22,2.2,'#997a52');
    for(const z of [0.7,2.3]) box(4.6,0.24,z,0.8,0.48,0.18,'#765e45');
    for(let i=0;i<5;i++) box(-4.4,0.22+(i%2)*0.25,-1+i*0.4,0.8,0.22,0.28,'#947652');
  }
  return {
    blocksWalking: (x:number,z:number)=>blockers.some(b=>Math.abs(x-b.x)<b.w/2+0.25&&Math.abs(z-b.z)<b.d/2+0.25),
    groundHeight(x:number,z:number){const cabin=woodlandCabins.find(c=>Math.abs(x-c.x)<3.4&&z>c.z-3.4&&z<c.z+5.3);return cabin?terrainHeight(cabin.x,cabin.z)+0.1:undefined;},
  };
}

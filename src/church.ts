import * as THREE from 'three';
import type { Box } from './world-life.ts';
import { terrainHeight } from './terrain.ts';

export function createChurch(scene:THREE.Scene,box:Box,solids:THREE.Object3D[],blockers:{x:number;z:number;w:number;d:number}[]) {
  const group=new THREE.Group();group.name='wedding-chapel';group.position.set(-43,terrainHeight(-43,16),16);scene.add(group);
  const wall='#ddd2b9',trim='#a89b80';
  box(0,0.04,0,9.4,0.08,13,trim,group);
  const wallBox=(x:number,y:number,z:number,w:number,h:number,d:number)=>{
    box(x,y,z,w,h,d,wall,group,true);blockers.push({x:x-43,z:z+16,w,d});
  };
  wallBox(-4.3,2.8,0,0.45,5.6,12);wallBox(4.3,2.8,0,0.45,5.6,12);wallBox(0,2.8,-6,9,5.6,0.45);
  wallBox(-3,2.8,6,3,5.6,0.45);wallBox(3,2.8,6,3,5.6,0.45);
  box(0,4.8,6,3,1.6,0.45,wall,group,true);
  for(const side of [-1,1]){
    const roof=box(side*2.35,6.1,0,5.3,0.3,13,'#896752',group);roof.rotation.z=side*-0.4;
    for(const z of [-3.7,0,3.7]) {
      box(side*4.57,3.4,z,0.09,2.4,1.3,trim,group);
      const glass=new THREE.Mesh(new THREE.PlaneGeometry(1,2.1),new THREE.MeshStandardMaterial({color:side===1?'#87a59c':'#9a829c',emissive:side===1?'#5b827c':'#826085',emissiveIntensity:0.45,side:THREE.DoubleSide,roughness:0.5}));
      glass.position.set(side*4.63,3.4,z);glass.rotation.y=Math.PI/2;group.add(glass);
      box(side*4.67,3.4,z,0.05,2.15,0.06,trim,group);box(side*4.67,3.4,z,0.05,0.06,1.1,trim,group);
    }
    box(side*1.56,1.65,6.26,0.17,3.3,0.25,trim,group);
    // Interior pews leave a central aisle for walking through the open door.
    for(const z of [-2,0,2,4]) {
      box(side*2.7,0.65,z,2.1,0.18,0.7,'#967756',group);box(side*2.7,1,z-0.3,2.1,0.7,0.12,'#967756',group);
    }
  }
  box(0,1.85,-4.6,0.18,2.6,0.17,'#967756',group);box(0,2.3,-4.6,1.2,0.18,0.18,'#967756',group);
  box(0,0.8,-4,2.5,1.6,0.9,'#baa68b',group);
  box(0,5.7,4.5,2.8,6,2.8,wall,group);
  box(0,8.6,5.94,1.4,1.2,0.08,'#5e6d64',group);
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.42,0.55,8),new THREE.MeshStandardMaterial({color:'#b59a59',metalness:0.5,roughness:0.4}));bell.position.set(0,8.6,6.03);group.add(bell);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(2.1,3.6,4),new THREE.MeshStandardMaterial({color:'#6f7d70',roughness:0.9}));spire.rotation.y=Math.PI/4;spire.position.set(0,11.1,4.5);spire.castShadow=true;group.add(spire);
  box(0,13.4,4.5,0.14,1.4,0.14,trim,group);box(0,13.65,4.5,0.85,0.14,0.14,trim,group);
  const light=new THREE.PointLight('#ffcf94',0,14,2);light.position.set(0,3,1);group.add(light);
  // The garden connects to the open chapel door along this short approach.
  box(0,0.055,8.3,3,0.07,4.3,'#c3b694',group);
  for(let x=-42;x<=-34;x+=1) box(x,terrainHeight(x,25)+0.04,25,1.05,0.06,2.5,'#c3b694');
  group.traverse(child=>{if(child instanceof THREE.Mesh&&!solids.includes(child)) child.receiveShadow=true;});
  return {setTime(darkness:number){light.intensity=darkness*20;}};
}

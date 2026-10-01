import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainHeight } from './terrain.ts';
import { createIdleRig, animateIdle } from './character-idle.ts';

export const workshopPlace = { name: 'Tidewright Workshop', x: 45, z: 86, entrance: [45, 81] as const };

// The workshop is an open working yard on the lane between the houses and ferry.
export function createHarbor(scene: THREE.Scene, solids: THREE.Object3D[], subjects: Map<string, THREE.Object3D>) {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
    return materials.get(color)!;
  };
  const cube = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 20, 14);
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const yard = new THREE.Group(); yard.name = 'tidewright-workshop'; yard.position.set(45, terrainHeight(45, 86), 86); scene.add(yard);
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    const mesh = new THREE.Mesh(cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const oval = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string) => {
    const mesh = new THREE.Mesh(sphere, material(color)); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const blockWalking = (x: number, z: number, w: number, d: number) => blockers.push({x,z,w,d});
  const batch = (group: THREE.Group, solid = false) => {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of group.children) if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const list = batches.get(child.material) ?? []; list.push(child); batches.set(child.material, list);
    }
    for (const [mat, meshes] of batches) {
      const geometries = meshes.map(mesh => { mesh.updateMatrix(); return (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      meshes.forEach(mesh => group.remove(mesh));
      const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); if (solid) solids.push(mesh);
    }
  };
  box(yard,0,0.02,0,11,0.05,7,'#beae8e');
  box(yard,0,2.1,3,10,4.2,0.2,'#91a397'); blockWalking(45,89,10,0.2);
  box(yard,0,4.35,0,10.8,0.22,6.6,'#53756e');
  for (const x of [-4.8,4.8]) {
    box(yard,x,2.1,-2.7,0.18,4.2,0.18,'#8f7555'); blockWalking(45+x,83.3,0.18,0.18);
    box(yard,x,2.1,2.7,0.18,4.2,0.18,'#8f7555'); blockWalking(45+x,88.7,0.18,0.18);
  }
  for (const x of [-4.9,4.9]) box(yard,x,1,0.8,0.16,2,3.8,'#91a397');
  blockWalking(40.1,86.8,0.16,3.8); blockWalking(49.9,86.8,0.16,3.8);
  // Pegboard, hand tools, timber rack and a little pot of spare fastenings.
  box(yard,-2.8,2.1,2.86,3.5,1.7,0.08,'#b69d76');
  for (let i=0;i<7;i++) {
    box(yard,-4.2+i*0.44,1.95,2.75,0.065,0.6,0.07,'#6c756b');
    box(yard,-4.2+i*0.44,2.25,2.7,0.22,0.12,0.08,'#b7bab0');
  }
  box(yard,-2.8,0.9,1.8,3.5,0.16,1.1,'#9f7b53');
  for (const x of [-4.2,-1.4]) box(yard,x,0.45,1.8,0.12,0.9,0.8,'#73674c');
  blockWalking(42.2,87.8,3.5,1.1);
  for (let i=0;i<6;i++) box(yard,-4.2+i*0.17,0.7,-0.2,0.12,0.13,3.2,'#c7a77a');
  const plan = box(yard,-2.7,1.0,1.6,1.1,0.025,0.7,'#eee3c9'); plan.rotation.y=-0.2;
  box(yard,-2.5,1.02,1.6,0.035,0.008,0.6,'#638681');
  const lamp = new THREE.PointLight('#ffe2ac',10,10); lamp.position.set(-2,3.5,1); yard.add(lamp);
  // A shaped open hull, raised gunwales and visible ribs, rather than a solid block.
  const boat = new THREE.Group(); boat.name = 'unfinished-harbor-boat'; boat.position.set(2,0.8,0); yard.add(boat);
  const vertices: number[] = [], indices: number[] = [];
  const rings = 24, sections = 16;
  for (let ring=0;ring<=rings;ring++) {
    const t=ring/rings, width=0.12+1.12*Math.sin(Math.PI*t)**0.7;
    for (let section=0;section<=sections;section++) {
      const angle=section/sections*Math.PI;
      vertices.push(-Math.cos(angle)*width,0.85-Math.sin(angle)*0.72,-2.6+t*5.2);
      if (ring<rings && section<sections) { const a=ring*(sections+1)+section; indices.push(a,a+1,a+sections+1,a+1,a+sections+2,a+sections+1); }
    }
  }
  const hullGeometry = new THREE.BufferGeometry(); hullGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); hullGeometry.setIndex(indices); hullGeometry.computeVertexNormals();
  const hullMaterial = new THREE.MeshStandardMaterial({color:'#b98358',roughness:0.78,side:THREE.DoubleSide});
  const hull = new THREE.Mesh(hullGeometry,hullMaterial); hull.castShadow=hull.receiveShadow=true; boat.add(hull);
  for (let ring=2;ring<rings;ring+=3) {
    const t=ring/rings,width=0.12+1.12*Math.sin(Math.PI*t)**0.7;
    const points=Array.from({length:17},(_,j)=>{const a=j/16*Math.PI;return new THREE.Vector3(-Math.cos(a)*width,0.88-Math.sin(a)*0.69,-2.6+t*5.2);});
    const rib=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,0.035,6,false),material('#e0bd8a')); boat.add(rib);
  }
  for (const side of [-1,1]) {
    const points=Array.from({length:25},(_,j)=>{const t=j/24;return new THREE.Vector3(side*(0.12+1.12*Math.sin(Math.PI*t)**0.7),0.9,-2.6+t*5.2);});
    boat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,0.06,8,false),material('#e0bd8a')));
  }
  for (const z of [-1.5,1.5]) {
    box(boat,0,-0.28,z,2.8,0.14,0.18,'#786b53');
    for (const x of [-1,1]) box(boat,x,-0.48,z,0.13,0.8,0.15,'#786b53');
  }
  blockWalking(47,86,2.5,5.4);
  const boatFocus=new THREE.Object3D(); boatFocus.position.set(0,0.9,-1.6); boat.add(boatFocus); boatFocus.userData.framePoints = [[0,0,0],[-1.25,0,1.6],[1.25,0,1.6],[0,0,4.2],[0,0,-1]]; subjects.set('Unfinished harbor boat',boatFocus);
  batch(boat);
  const people: { person: THREE.Group; arms: THREE.Group[] }[]=[];
  const character = (name: string, x: number, z: number, skin: string, hair: string, shirt: string, apron: string, height: number) => {
    const person=new THREE.Group(); person.name=name; person.position.set(x,terrainHeight(x,z),z); person.scale.y=height; scene.add(person); person.rotation.y=Math.PI;
    const arms: THREE.Group[] = [];
    oval(person,0,1.07,0,0.32,0.38,0.22,shirt);
    box(person,0,1.04,0.224,0.42,0.63,0.035,apron);
    for (const side of [-1,1]) {
      box(person,side*0.17,1.4,0.2,0.045,0.21,0.04,apron);
      oval(person,side*0.15,0.42,0,0.12,0.4,0.13,'#46565b');
      oval(person,side*0.15,0.08,0.07,0.15,0.085,0.23,'#654f3c');
      const arm = new THREE.Group(); arm.position.set(side*0.34,1.4,0); person.add(arm); arms.push(arm);
      oval(arm,0,-0.22,0,0.11,0.23,0.14,shirt);
      oval(arm,side*0.02,-0.49,0.025,0.075,0.17,0.085,skin);
      oval(arm,side*0.02,-0.66,0.065,0.09,0.1,0.075,skin); batch(arm);
      oval(person,side*0.21,1.65,0,0.04,0.065,0.05,skin);
      oval(person,side*0.082,1.71,0.201,0.027,0.021,0.013,'#303f3b');
      box(person,side*0.085,1.77,0.197,0.07,0.018,0.025,hair);
    }
    oval(person,0,1.43,0,0.1,0.15,0.1,skin);
    oval(person,0,1.67,0,0.21,0.26,0.2,skin);
    oval(person,0,1.86,-0.05,0.218,0.13,0.19,hair);
    oval(person,0,1.66,0.218,0.041,0.06,0.045,skin);
    box(person,0,1.57,0.197,0.08,0.012,0.018,'#925e4f');
    box(person,0.1,0.95,0.25,0.18,0.13,0.025,'#d9c39b');
    box(person,-0.15,1.02,0.25,0.04,0.28,0.04,'#bb6e46');
    const focus=new THREE.Object3D(); focus.position.set(0,1.5,0.24); focus.userData.framePoints = [[0,0.4,0],[0,-0.9,0]]; person.add(focus);
    people.push({person,arms}); return {person,focus};
  };
  const ruth=character('ruth-boatbuilder',42,84,'#a97957','#c5c0ae','#658387','#bb9a6d',1);
  // Ruth's round spectacles and rolled kerchief give her a recognizable silhouette.
  for (const x of [-0.085,0.085]) {
    const glasses=new THREE.Mesh(new THREE.TorusGeometry(0.062,0.009,6,16),material('#566b63')); glasses.position.set(x,1.71,0.219); ruth.person.add(glasses);
  }
  box(ruth.person,0,1.71,0.226,0.055,0.014,0.018,'#566b63');
  oval(ruth.person,0,1.45,0.1,0.14,0.06,0.13,'#d9bc82');
  const nessa=character('nessa-apprentice',45,84,'#795641','#302b2b','#ba7d69','#718b7b',1.06);
  oval(nessa.person,0,1.78,-0.24,0.12,0.15,0.16,'#302b2b');
  const kit=character('kit-apprentice',48.2,83.8,'#dec0a2','#98653e','#c4ad6a','#738998',0.94);
  oval(kit.person,0,1.88,0,0.23,0.1,0.23,'#698491'); box(kit.person,0,1.85,0.12,0.46,0.04,0.3,'#698491');
  subjects.set('Ruth the boatbuilder',ruth.focus); subjects.set('Nessa the apprentice',nessa.focus); subjects.set('Kit the apprentice',kit.focus);
  const crewFocus=new THREE.Object3D(); crewFocus.position.set(45,terrainHeight(45,84)+1.5,84); scene.add(crewFocus); subjects.set('Harbor repair crew',crewFocus);
  const portraitFocus=new THREE.Object3D(); portraitFocus.position.set(44.2,terrainHeight(44.2,84.8)+1.5,84.8); scene.add(portraitFocus); subjects.set('Ruth and her work',portraitFocus);
  let shared: boolean | undefined;
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):undefined;
  if (canvas) {canvas.width=1024;canvas.height=512;}
  const texture=canvas?new THREE.CanvasTexture(canvas):undefined; if(texture)texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7),new THREE.MeshBasicMaterial({color:texture?'#ffffff':'#ece0c6',map:texture??null}));
  sign.name='tidewright-hearing-board'; sign.position.set(0,2.35,2.86); sign.rotation.y=Math.PI; yard.add(sign);
  const setShared = (value: boolean) => {
    if(shared===value)return; shared=value;
    const ctx=canvas?.getContext('2d'); if(!ctx||!texture)return;
    ctx.fillStyle='#eee2c7';ctx.fillRect(0,0,1024,512);ctx.fillStyle='#456c65';ctx.fillRect(0,0,1024,100);ctx.fillStyle='#fff1d4';ctx.font='bold 42px Georgia';ctx.textAlign='center';ctx.fillText('TIDEWRIGHT WORKSHOP',512,66);
    ctx.fillStyle='#354a42';ctx.font='34px Georgia';
    const lines=value?['PEOPLE, PATHS AND LIVELIHOODS','Ruth · Nessa · Kit','Delivery bay suggested for the hearing','Access and costs still to be checked','Photographs and captions shared with June']:['Boats repaired · Skills passed on','Ruth · Nessa · Kit','Deliveries via the existing harbor lane','Ask Ruth about a workshop portrait','A working harbor is part of home.'];
    lines.forEach((line,i)=>ctx.fillText(line,512,170+i*66));texture.needsUpdate=true;
  };
  const rigs = people.map(({person,arms}) => {
    const rig = createIdleRig(person,arms); batch(rig.head); batch(rig.torso); batch(person); return rig;
  });
  setShared(false); batch(yard,true);
  return { setShared, blocksWalking: (x:number,z:number)=>blockers.some(b=>Math.abs(x-b.x)<b.w/2+0.2&&Math.abs(z-b.z)<b.d/2+0.2), update(time:number) { people.forEach(({person},i)=>{person.rotation.y=Math.PI+Math.sin(time*0.35+i)*0.06; animateIdle(rigs[i],time,i+31);}); } };
}

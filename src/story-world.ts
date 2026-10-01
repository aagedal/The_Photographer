import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';

export const galleryPlace = { name: 'Willowbrook Gallery', x: -7, z: 31, entrance: [-7, 26] as const };
export const unclePlace = { name: 'Arthur’s porch', x: -23, z: 49, entrance: [-23, 55] as const };
export function nearStoryPlace(place: typeof galleryPlace | typeof unclePlace, x: number, y: number, z: number) {
  const [px, pz] = place.entrance;
  return Math.hypot(x - px, y - terrainHeight(px, pz) - 1.7, z - pz) < 4;
}
export function createStoryPlaces(scene: THREE.Scene, solids: THREE.Object3D[]) {
  const blockers: { x: number; z: number; w: number; d: number }[] = [];
  const block = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color,roughness:0.85}));
    mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    if (solid) { solids.push(mesh); const p = parent.position; blockers.push({x:p.x+x,z:p.z+z,w,d}); }
    return mesh;
  };
  const gallery = new THREE.Group(); gallery.name = 'willowbrook-gallery'; gallery.position.set(galleryPlace.x,terrainHeight(galleryPlace.x,galleryPlace.z),galleryPlace.z); scene.add(gallery);
  block(gallery,0,0.03,0,8,0.06,5,'#cbbda1',false);
  block(gallery,0,2,2.5,8,4,0.2,'#e8dfc9');
  for (const x of [-4,4]) block(gallery,x,2,0,0.2,4,5,'#e8dfc9');
  block(gallery,0,4,0,8.4,0.2,5.4,'#687a6c',false);
  block(gallery,0,3.45,-2.5,8,0.8,0.2,'#496a5b',false);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle='#496a5b'; ctx.fillRect(0,0,768,96); ctx.fillStyle='#f4e9cf'; ctx.font='42px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(galleryPlace.name,384,48);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.7,0.75),new THREE.MeshBasicMaterial({map:texture})); sign.position.set(0,3.45,-2.62); sign.rotation.y=Math.PI; gallery.add(sign);
    }
  }
  const frames: THREE.Mesh[] = [];
  for (let i=0;i<8;i++) {
    const x=-2.9+(i%4)*1.95, y=i<4?2.7:1.25;
    block(gallery,x,y,2.32,1.62,1.07,0.1,'#70543e',false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.45,0.93),new THREE.MeshBasicMaterial({color:'#d5cab2'})); face.position.set(x,y,2.25); face.rotation.y=Math.PI; gallery.add(face); frames.push(face);
  }
  // Eight more frames on the side walls keep every assignment's print visible.
  for (const side of [-1, 1]) for (let i=0; i<4; i++) {
    const z=-1.25+(i%2)*2, y=i<2?2.7:1.25;
    block(gallery,side*3.85,y,z,0.1,1.07,1.62,'#70543e',false);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.45,0.93),new THREE.MeshBasicMaterial({color:'#d5cab2'}));
    face.position.set(side*3.78,y,z); face.rotation.y=-side*Math.PI/2; gallery.add(face); frames.push(face);
  }
  const galleryLamp = new THREE.PointLight('#ffe5b4',14,9); galleryLamp.position.set(0,3,0); gallery.add(galleryLamp);
  const porch = new THREE.Group(); porch.name='arthur-home'; porch.position.set(unclePlace.x,terrainHeight(unclePlace.x,unclePlace.z),unclePlace.z); scene.add(porch);
  block(porch,0,1.7,0,6,3.4,4,'#d9c5a1'); block(porch,0,3.5,0,6.6,0.3,4.6,'#8c7054',false);
  block(porch,0,0.15,3,6,0.3,2,'#ae9270',false);
  for (const x of [-2.6,2.6]) block(porch,x,1.6,3.5,0.14,3.2,0.14,'#8d7e60');
  block(porch,0,3.2,3,6.5,0.2,2.4,'#8c7054',false);
  block(porch,-1,1,2.02,1,2,0.05,'#687b61',false);
  block(porch,1.6,1.9,2.03,1.4,1.1,0.05,'#c3d6c2',false);
  block(porch,1,0.6,3,1.1,0.2,0.9,'#8d6a4b',false);
  block(porch,1,1,2.6,1.1,1,0.16,'#8d6a4b',false);
  const person = scene.getObjectByName('npc-maker')!.clone(); person.name='uncle-arthur'; person.getObjectByName('npc-marker-maker')?.removeFromParent(); person.position.set(1,0.1,3.1); person.scale.multiplyScalar(0.85); porch.add(person);
  const textures = new Map<string, THREE.Texture>();
  return {
    blocksWalking: (x:number,z:number) => blockers.some(b=>Math.abs(x-b.x)<b.w/2+0.2&&Math.abs(z-b.z)<b.d/2+0.2),
    displayPrints(prints: { photoId: string; image: string }[]) {
      if (typeof document === 'undefined') return;
      frames.forEach((frame,i)=> {
        const material=frame.material as THREE.MeshBasicMaterial, print=prints[i];
        const current=frame.userData.photoId;
        if (current===print?.photoId) return;
        frame.userData.photoId=print?.photoId;
        material.map=null; material.color.set(print?'#ffffff':'#d5cab2'); material.needsUpdate=true;
        if (print) {
          const key=print.photoId;
          let texture=textures.get(key);
          if (!texture) { texture=new THREE.TextureLoader().load(print.image); texture.colorSpace=THREE.SRGBColorSpace; textures.set(key,texture); }
          material.map=texture; material.needsUpdate=true;
        }
      });
      const used=new Set(prints.slice(0,frames.length).map(p=>p.photoId));
      for (const [key,texture] of textures) if (!used.has(key)) { texture.dispose(); textures.delete(key); }
    },
  };
}

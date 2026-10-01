import * as THREE from 'three';
import type { GalleryPrint } from './story.ts';
import { missions } from './missions.ts';

export const exhibitionVisitorCount = (open:boolean, printCount:number) => open && printCount>=5 ? Math.min(12,printCount) : 0;
const roster = ['Nora','Sam','Leah','Owen','Iris','Felix','Ada','Ben','Cora','Jules','Mina','Robin','Esme','Leo','Tess','Finn'];
const hash = (text:string) => [...text].reduce((value,char)=>(Math.imul(value,31)+char.charCodeAt(0))>>>0,17);
export function visitorComment(print:GalleryPrint, variant:number) {
  const mission=missions.find(m=>m.id===print.missionId);
  const observations: Record<string,string[]> = {
    Nature: ['You can almost hear how quiet it was.','I love that the animal has room to be itself.','That light makes me want to take the long way home.'],
    Wedding: ['Look at their faces. That is a moment worth keeping.','I know this garden, but I have never noticed it like this.','This feels like being there with the family.'],
    Sports: ['You caught the energy of the race.','I can feel the effort in that stride.','Our little running club looks wonderful here.'],
    News: ['There is a whole story in the details.','This makes me look at our town a little differently.','I am glad someone stopped to show us this.'],
    Studio: ['The light really brings out the shape.','You can see the care that went into making this.','I keep coming back to those little details.'],
    Astro: ['All of that was above us while we were asleep.','I should get out to the ridge more often.','This makes the island feel so small beneath the sky.'],
  };
  const lines=observations[mission?.category??'Nature']??observations.Nature;
  return `“${mission?.title??'This photograph'}” — ${lines[variant%lines.length]}`;
}
interface Character {group:THREE.Group;legs:THREE.Group[];arms:THREE.Group[]}
type Person = (x:number,z:number,shirt:string,parent?:THREE.Object3D,variant?:number)=>Character;
export function createGalleryVisitors(gallery:THREE.Group, frames:THREE.Mesh[], person:Person) {
  // A pool limits draw calls and keeps visitor identities stable during shutter sampling.
  const visitors=Array.from({length:12},(_,i)=>{
    const character=person(0,0,['#ad685b','#658e99','#c3a166','#788761','#9b83a1','#e0ccaa'][i%6],gallery,i+10);
    character.group.name=`gallery-visitor-${i}`;character.group.visible=false;
    const canvas=typeof document==='undefined'?undefined:document.createElement('canvas');
    if(canvas){canvas.width=768;canvas.height=192;}
    const texture=canvas?new THREE.CanvasTexture(canvas):undefined;
    if(texture) texture.colorSpace=THREE.SRGBColorSpace;
    const bubble=new THREE.Sprite(new THREE.SpriteMaterial({map:texture??null,color:'#ffffff',depthWrite:false}));
    bubble.name='visitor-comment';bubble.position.y=2.65/character.group.scale.y;bubble.scale.set(3.8/character.group.scale.x,0.95/character.group.scale.y,1);bubble.visible=false;
    character.group.add(bubble);
    return {character,bubble,canvas,texture,name:'',comment:'',print:undefined as GalleryPrint|undefined,target:new THREE.Vector3()};
  });
  let state='',count=0;
  return {
    get count(){return count;},
    setExhibition(open:boolean,prints:GalleryPrint[],day=1){
      const next=`${open}:${day}:${prints.map(p=>p.photoId).join('|')}`;
      if(next===state)return;state=next;count=exhibitionVisitorCount(open,prints.length);
      const rotation=hash(next)%roster.length;
      visitors.forEach((visitor,i)=>{
        visitor.character.group.visible=i<count;visitor.bubble.visible=false;
        if(i>=count){visitor.print=undefined;return;}
        visitor.name=roster[(rotation+i)%roster.length];
        const index=(hash(`${day}:${i}:${prints.length}`)%Math.min(prints.length,frames.length));
        visitor.print=prints[index];visitor.comment=visitorComment(visitor.print,rotation+i);
        visitor.target.copy(frames[index].position);
        // Staggered viewing positions leave the central aisle and doorway open.
        const x=[-4.4,-2.6,-1.3,1.3,2.6,4.4][i%6],z=i<6?-3.2:1.6;
        visitor.character.group.position.set(x,0.06,z);
        const yaw=Math.atan2(visitor.target.x-x,visitor.target.z-z);
        visitor.character.group.rotation.y=yaw;
        visitor.character.group.userData.visitorYaw=yaw;
        const ctx=visitor.canvas?.getContext('2d');
        if(ctx&&visitor.texture){
          ctx.clearRect(0,0,768,192);ctx.fillStyle='#f4ead5';ctx.beginPath();ctx.roundRect(0,0,768,180,18);ctx.fill();
          ctx.fillStyle='#496a5b';ctx.font='bold 28px Georgia';ctx.fillText(visitor.name,24,40);
          ctx.fillStyle='#35483d';ctx.font='24px Georgia';
          const words=visitor.comment.split(' ');let line='',row=0;
          for(const word of words){if(ctx.measureText(`${line} ${word}`).width>714){ctx.fillText(line,24,78+row*32);line=word;row++;}else line+=`${line?' ':''}${word}`;}
          ctx.fillText(line,24,78+row*32);visitor.texture.needsUpdate=true;
        }
      });
    },
    update(time:number){visitors.forEach((visitor,i)=>{
      if(!visitor.character.group.visible)return;
      visitor.character.group.rotation.y=Number(visitor.character.group.userData.visitorYaw)+Math.sin(time*0.2+i)*0.08;
      visitor.bubble.visible=!!visitor.texture&&((Math.floor(time/6)%Math.max(1,count))+count)%count===i && ((time%6)+6)%6<4;
    });},
    nearest(x:number,y:number,z:number){
      let closest: {name:string;comment:string;print:GalleryPrint;object:THREE.Group}|undefined,distance=2.1;
      for(const visitor of visitors){
        if(!visitor.character.group.visible||!visitor.print)continue;
        const p=visitor.character.group.getWorldPosition(new THREE.Vector3());
        const next=Math.hypot(x-p.x,y-p.y-1.7,z-p.z);
        if(next<distance){distance=next;closest={name:visitor.name,comment:visitor.comment,print:visitor.print,object:visitor.character.group};}
      }
      return closest;
    },
  };
}

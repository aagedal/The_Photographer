import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { terrainHeight } from '../src/terrain.ts';
const world=createWorld();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1200,750);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.append(renderer.domElement);
// Include reflection and shadow passes in the workload, not just the last pass.
renderer.info.autoReset=false;
const camera=new THREE.PerspectiveCamera(58,1.6,0.1,900);
const forest=world.scene.getObjectByName('forest-trunks')!;
const treeMatrix=new THREE.Matrix4(),hillTree=new THREE.Vector3();
let foundHillTree=false;
forest.traverse(mesh=>{if(!(mesh instanceof THREE.InstancedMesh)||foundHillTree)return;for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,treeMatrix);hillTree.setFromMatrixPosition(treeMatrix);
  if(hillTree.x<-60&&hillTree.z>10&&hillTree.z<50&&terrainHeight(hillTree.x,hillTree.z)>3){foundHillTree=true;break;}
}});
const views: {name:string;hour:number;position:[number,number,number];target:[number,number,number]}[]=[
  {name:'Observatory foundation',hour:15,position:[-143,terrainHeight(-143,-163)+1.7,-163],target:[-143,terrainHeight(-143,-183)+3,-183]},
  {name:'Observatory annex',hour:15,position:[-118,terrainHeight(-118,-169)+1.7,-169],target:[-130,terrainHeight(-143,-183)+1,-183]},
  {name:'Town center',hour:15,position:[15,1.7,28],target:[4,2,-22]},
  {name:'Out to sea',hour:15,position:[15,1.7,28],target:[15,2,180]},
  {name:'Neighborhood',hour:15,position:[20,1.7,38],target:[20,2,60]},
  {name:'Sunrise · east',hour:7.5,position:[0,5,20],target:[100,45,30]},
  {name:'Sunset · west',hour:17,position:[0,5,20],target:[-100,31,27]},
  {name:'Tree bases · lake',hour:15,position:[11,terrainHeight(11,14)+0.7,14],target:[9,terrainHeight(9,11)+0.3,11]},
  {name:'Tree bases · hillside',hour:15,position:[hillTree.x+2.5,terrainHeight(hillTree.x+2.5,hillTree.z+3)+0.7,hillTree.z+3],target:[hillTree.x,terrainHeight(hillTree.x,hillTree.z)+0.3,hillTree.z]},
  {name:'Lakeside',hour:15,position:[-15,2,20],target:[-6,2,-10]},
  {name:'Meadow',hour:15,position:[-62,terrainHeight(-62,54)+1.7,54],target:[-74,terrainHeight(-74,61)+0.7,61]},
  {name:'Garden',hour:16,position:[-27,1.7,34],target:[-24,1.5,25]},
  {name:'Harbor',hour:17,position:[45,2.5,76],target:[45,2.2,86]},
  {name:'Arthur',hour:17,position:[-23,terrainHeight(-23,55)+1.7,55],target:[-22,terrainHeight(-23,49)+1.8,52]},
  {name:'Twilight',hour:19.6,position:[-15,2,20],target:[-6,3,-10]},
  {name:'Birds',hour:15,position:[0,6,36],target:[-20,27,-12]},
];
let time=24,animated=false;
function render(){world.update(time,{filter:'none',shutter:1/125});renderer.info.reset();renderer.render(world.scene,camera);document.querySelector('#status')!.textContent=`${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles · t=${time.toFixed(2)} s`;}
function select(view:typeof views[number]){world.setTime(view.hour);camera.position.set(...view.position);camera.lookAt(...view.target);render();}
views.forEach(view=>{const button=document.createElement('button');button.textContent=view.name;button.onclick=()=>select(view);document.querySelector('#views')!.append(button);});
document.querySelector<HTMLButtonElement>('#animate')!.onclick=event=>{animated=!animated;(event.target as HTMLButtonElement).textContent=animated?'Pause':'Animate';};
document.querySelector<HTMLButtonElement>('#measure')!.onclick=async()=>{
  animated=false;
  document.querySelector<HTMLButtonElement>('#animate')!.textContent='Animate';
  const button=document.querySelector<HTMLButtonElement>('#measure')!;button.disabled=true;
  const lines=['Average submitted work over 60 live frames at the selected viewpoint (includes reflections).'];
  renderer.shadowMap.autoUpdate=false;
  for(const [label,interval,shadows] of [['Balanced',0,true],['Mobile balanced',66,true],['Performance',100,false]] as const){
    renderer.shadowMap.enabled=shadows;world.prepareRender();
    let calls=0,triangles=0;
    for(let frame=0;frame<60;frame++){
      world.update(time+frame/60,{filter:'none',shutter:1/125});world.prepareRender(frame*1000/60,interval);
      renderer.shadowMap.needsUpdate=frame%10===0;renderer.info.reset();renderer.render(world.scene,camera);
      calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
      if(frame%5===4)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
    lines.push(`${label}: ${Math.round(calls/60)} draw calls · ${Math.round(triangles/60).toLocaleString()} triangles`);
  }
  document.querySelector('#workload')!.textContent=lines.join('\n');
  world.prepareRender();renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;render();
  button.disabled=false;
};
let previous=performance.now();function frame(now:number){if(animated){time+=Math.min(0.05,(now-previous)/1000);render();}previous=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);select(views[0]);

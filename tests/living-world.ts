import * as THREE from 'three';
import { missions } from '../src/missions.ts';
import { createWorld } from '../src/world.ts';
import { terrainHeight } from '../src/terrain.ts';
import { galleryPlace, unclePlace, hospitalPlace, woodlandCabins } from '../src/world-layout.ts';
import { reflectionRefreshInterval } from '../src/render-quality.ts';
import { createGpuTimer } from '../src/gpu-timer.ts';
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
  {name:'Grass close-up',hour:15,position:[-70,terrainHeight(-70,54)+0.45,54],target:[-73,terrainHeight(-73,57)+0.3,57]},
  {name:'Garden',hour:16,position:[-43,1.7,39],target:[-43,1.5,29]},
  {name:'Gallery exterior',hour:15,position:[-43,terrainHeight(-43,-14)+1.7,-14],target:[-43,terrainHeight(-43,-29)+2,-29]},
  {name:'Gallery interior',hour:15,position:[-43,terrainHeight(-43,-24)+1.76,-24],target:[-43,terrainHeight(-43,-33)+1.9,-33]},
  {name:'Hospital',hour:15,position:[hospitalPlace.x,1.7,hospitalPlace.z+9],target:[hospitalPlace.x,2,hospitalPlace.z]},
  ...woodlandCabins.map(c=>({name:c.name,hour:15,position:[c.x,terrainHeight(c.x,c.z)+1.7,c.z+10] as [number,number,number],target:[c.x,terrainHeight(c.x,c.z)+1.5,c.z] as [number,number,number]})),
  {name:'Harbor',hour:17,position:[45,2.5,76],target:[45,2.2,86]},
  {name:'Arthur',hour:17,position:[unclePlace.x,1.7,unclePlace.z+8],target:[unclePlace.x+1,1.8,unclePlace.z+3]},
  {name:'Twilight',hour:19.6,position:[-15,2,20],target:[-6,3,-10]},
  {name:'Birds',hour:15,position:[0,6,36],target:[-20,27,-12]},
];
const exhibitionPrints = missions.map((mission,i)=>{
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=['#789482','#ae8765','#71879a','#97849e'][i%4];ctx.fillRect(0,0,600,400);ctx.fillStyle='#f6edd8';ctx.font='26px Georgia';ctx.textAlign='center';ctx.fillText(mission.title,300,190);ctx.font='20px Georgia';ctx.fillText('Exhibition preview',300,230);
  return {photoId:`preview-${i}`,missionId:mission.id,image:canvas.toDataURL('image/jpeg',.75)};
});
world.storyPlaces.displayPrints(exhibitionPrints);
world.galleryVisitors.setExhibition(true,exhibitionPrints);
let time=24,animated=false;
function render(){world.update(time,{filter:'none',shutter:1/125});renderer.info.reset();renderer.render(world.scene,camera);document.querySelector('#status')!.textContent=`${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles · t=${time.toFixed(2)} s`;}
function select(view:typeof views[number]){world.setTime(view.hour);camera.position.set(...view.position);camera.lookAt(...view.target);render();}
views.forEach(view=>{const button=document.createElement('button');button.textContent=view.name;button.onclick=()=>select(view);document.querySelector('#views')!.append(button);});
const grass=world.scene.getObjectByName('wind-meadow-grass')!;
document.querySelector<HTMLButtonElement>('#grass')!.onclick=event=>{
  grass.visible=!grass.visible;(event.target as HTMLButtonElement).textContent=grass.visible?'Grass: on':'Grass: off';render();
};
document.querySelector<HTMLButtonElement>('#lens')!.onclick=event=>{
  camera.fov=camera.fov===58?18:58;camera.updateProjectionMatrix();
  (event.target as HTMLButtonElement).textContent=camera.fov===58?'Lens: wide':'Lens: telephoto';render();
};
document.querySelector<HTMLButtonElement>('#animate')!.onclick=event=>{animated=!animated;(event.target as HTMLButtonElement).textContent=animated?'Pause':'Animate';};
document.querySelector<HTMLButtonElement>('#measure')!.onclick=async()=>{
  animated=false;
  document.querySelector<HTMLButtonElement>('#animate')!.textContent='Animate';
  const button=document.querySelector<HTMLButtonElement>('#measure')!;button.disabled=true;
  const percentile=(samples:number[],fraction:number)=>{
    if(!samples.length)return 'unavailable';
    const sorted=[...samples].sort((a,b)=>a-b);return `${sorted[Math.min(sorted.length-1,Math.floor(sorted.length*fraction))].toFixed(2)} ms`;
  };
  const lines=[`60 samples at 1200 × 750 · ${grass.visible?'grass on':'grass off'} · ${camera.fov}° FOV · includes reflection/shadow passes.`,
    'Reflection/shadow workload uses a fixed 60 Hz simulation; timings are measured on this device.',
    'CPU measures render submission, not GPU completion. Frame intervals include display scheduling.'];
  document.querySelectorAll<HTMLButtonElement>('#views button,#grass,#lens,#animate').forEach(control=>control.disabled=true);
  let timer=createGpuTimer(renderer.getContext() as WebGL2RenderingContext);
  renderer.shadowMap.autoUpdate=false;
  try {
  for(const [label,interval,shadows] of [
    ['Full refresh reference',0,true],
    ['Balanced',reflectionRefreshInterval(false,false),true],
    ['Mobile balanced',reflectionRefreshInterval(false,true),true],
    ['Performance',reflectionRefreshInterval(true,false),false],
  ] as const){
    // Never attribute delayed queries from the preceding profile to this one.
    timer.dispose();timer=createGpuTimer(renderer.getContext() as WebGL2RenderingContext);
    renderer.shadowMap.enabled=shadows;world.prepareRender();
    let calls=0,triangles=0;
    const cpu:number[]=[],gpu:number[]=[],frames:number[]=[];
    // Compile programs and populate reflection textures before measuring.
    for(let warm=0;warm<6;warm++){
      world.update(time,{filter:'none',shutter:1/125});renderer.shadowMap.needsUpdate=true;renderer.render(world.scene,camera);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
    timer.poll();
    let previousFrame=performance.now();
    for(let frame=0;frame<60;frame++){
      const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));
      frames.push(now-previousFrame);previousFrame=now;
      world.update(time+frame/60,{filter:'none',shutter:1/125});world.prepareRender(frame*1000/60,interval);
      renderer.shadowMap.needsUpdate=frame%10===0;renderer.info.reset();
      gpu.push(...timer.poll());timer.begin();const start=performance.now();
      try{renderer.render(world.scene,camera);}finally{timer.end();}
      cpu.push(performance.now()-start);
      calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
    }
    for(let drain=0;drain<8;drain++){
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));gpu.push(...timer.poll());
    }
    lines.push(`${label}: ${Math.round(calls/60)} draw calls · ${Math.round(triangles/60).toLocaleString()} triangles`,
      `  CPU p50 / p95: ${percentile(cpu,0.5)} / ${percentile(cpu,0.95)}`,
      `  GPU p50 / p95: ${percentile(gpu,0.5)} / ${percentile(gpu,0.95)} (${gpu.length} samples)`,
      `  Frame interval p50 / p95: ${percentile(frames.slice(1),0.5)} / ${percentile(frames.slice(1),0.95)}`);
    document.querySelector('#workload')!.textContent=lines.join('\n');
  }
  } finally {
  timer.dispose();
  world.prepareRender();renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;render();
  document.querySelectorAll<HTMLButtonElement>('#views button,#grass,#lens,#animate').forEach(control=>control.disabled=false);
  button.disabled=false;
  }
};
let previous=performance.now();function frame(now:number){if(animated){time+=Math.min(0.05,(now-previous)/1000);render();}previous=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);select(views[0]);

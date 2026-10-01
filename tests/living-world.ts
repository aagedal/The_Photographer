import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { terrainHeight } from '../src/terrain.ts';
const world=createWorld();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1200,750);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(58,1.6,0.1,900);
const forest=world.scene.getObjectByName('forest-trunks') as THREE.InstancedMesh;
const treeMatrix=new THREE.Matrix4(),hillTree=new THREE.Vector3();
for(let i=0;i<forest.count;i++){
  forest.getMatrixAt(i,treeMatrix);hillTree.setFromMatrixPosition(treeMatrix);
  if(hillTree.x<-60&&hillTree.z>10&&hillTree.z<50&&terrainHeight(hillTree.x,hillTree.z)>3)break;
}
const views: {name:string;hour:number;position:[number,number,number];target:[number,number,number]}[]=[
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
function render(){world.update(time,{filter:'none',shutter:1/125});renderer.render(world.scene,camera);document.querySelector('#status')!.textContent=`${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles · t=${time.toFixed(2)} s`;}
function select(view:typeof views[number]){world.setTime(view.hour);camera.position.set(...view.position);camera.lookAt(...view.target);render();}
views.forEach(view=>{const button=document.createElement('button');button.textContent=view.name;button.onclick=()=>select(view);document.querySelector('#views')!.append(button);});
document.querySelector<HTMLButtonElement>('#animate')!.onclick=event=>{animated=!animated;(event.target as HTMLButtonElement).textContent=animated?'Pause':'Animate';};
let previous=performance.now();function frame(now:number){if(animated){time+=Math.min(0.05,(now-previous)/1000);render();}previous=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);select(views[0]);

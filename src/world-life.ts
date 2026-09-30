import * as THREE from 'three';
import { terrainHeight } from './terrain.ts';
import { isActiveHour, routeLength, routePose, routinePose, townRoad, townSidewalk, trafficRoutes, type Route } from './life.ts';

export type Box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent?: THREE.Object3D, solid?: boolean) => THREE.Mesh;
type Sphere = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, parent: THREE.Object3D) => THREE.Mesh;
interface Character { group: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[] }
interface Builders {
  scene: THREE.Scene; solids: THREE.Object3D[]; box: Box; sphere: Sphere;
  person: (x: number, z: number, shirt: string, parent?: THREE.Object3D, variant?: number) => Character;
  house: (x: number, z: number, w: number, h: number, d: number, color: string) => THREE.Group;
  batchMeshes: (parent: THREE.Object3D, exclude?: Set<THREE.Object3D>) => void;
}

export function createTownLife({ scene, solids, box, sphere, person, house, batchMeshes }: Builders) {
  const glow = new THREE.MeshStandardMaterial({ color: '#f4d8a0', emissive: '#ffcb7d', roughness: 0.6 });
  const headlights = new THREE.MeshStandardMaterial({ color: '#f4eedb', emissive: '#fff0bb', roughness: 0.4 });
  const tailLights = new THREE.MeshStandardMaterial({ color: '#9a453b', emissive: '#ff392b', roughness: 0.4 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const lamps: THREE.PointLight[] = [];
  const ribbon = (route: Route, width: number, height: number, colour: string) => {
    const vertices: number[] = [], indices: number[] = [];
    // Short segments conform to the terrain even along the access road.
    const samples = Math.ceil(routeLength(route) / 0.8);
    for (let i = 0; i <= samples; i++) {
      const p = routePose(route, i / samples * routeLength(route));
      for (const side of [-1, 1]) {
        const x = p.x + Math.cos(p.yaw) * width / 2 * side, z = p.z - Math.sin(p.yaw) * width / 2 * side;
        vertices.push(x, terrainHeight(x, z) + height, z);
      }
      if (i < samples) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 1, side: THREE.DoubleSide }));
    mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  ribbon(townRoad, 8.8, 0.045, '#c1bca9').name = 'neighborhood-sidewalk';
  ribbon(townRoad, 6.2, 0.06, '#747c78').name = 'neighborhood-road';
  // A narrow lane connects the new neighborhood to the running club.
  const access: Route = [[48,17],[48,37],[48,17]];
  ribbon(access, 8.8, 0.04, '#c1bca9'); ribbon(access, 6.2, 0.055, '#747c78');
  for (let distance = 0; distance < routeLength(townRoad); distance += 5) {
    const p = routePose(townRoad, distance);
    const stripe = box(p.x, terrainHeight(p.x,p.z) + 0.07, p.z, 0.09, 0.015, 1.7, '#dcd7bd'); stripe.rotation.y = p.yaw;
  }
  for (const z of [20,25,30,35]) box(48, terrainHeight(48,z) + 0.065, z, 0.09, 0.01, 1.7, '#dcd7bd');
  // Crosswalk and a bus shelter give the street a readable pedestrian entrance.
  for (let i = 0; i < 7; i++) box(17, 0.078, 34.6 + i * 0.8, 2.7, 0.02, 0.4, '#eee6cd');
  const shelter = new THREE.Group(); shelter.position.set(26, 0, 32); shelter.name = 'bus-shelter'; scene.add(shelter);
  box(0, 2.7, 0, 4.8, 0.18, 2, '#657e78', shelter);
  for (const x of [-2.1,2.1]) box(x, 1.35, -0.7, 0.12, 2.7, 0.12, '#526861', shelter);
  box(0, 1.6, -0.8, 4.3, 2.2, 0.12, '#9fb7ac', shelter); box(0, 0.7, 0, 3.4, 0.18, 0.7, '#9b805e', shelter);
  box(3.2, 1.65, 0, 0.1, 3.3, 0.1, '#53695e', shelter); box(3.2, 3.1, 0, 0.9, 0.8, 0.1, '#cda267', shelter);
  for (const [i,x] of [4,17,30,40].entries()) {
    house(x, 48, 6.5, 3.8 + i % 2, 6, ['#e1d0b1','#bfc9b5','#d6b398','#c0c7cc'][i]);
    box(x, 0.05, 53.5, 1.5, 0.08, 4.5, '#c3b694');
    house(x, 71, 6.5, 3.6 + (i+1) % 2, 5, ['#c9ba9c','#d4c3a8','#c8c9ae','#d0b8a6'][i]);
    box(x, 0.05, 66, 2, 0.08, 4.5, '#c3b694');
    for (const z of [44,74]) {
      box(x, 0.35, z, 7, 0.55, 0.18, '#829278');
      box(x - 3.5, 0.35, z + (z === 44 ? 2 : -2), 0.18, 0.55, 4, '#829278');
    }
    box(x - 2.6, 0.55, 54.5, 0.08, 1.1, 0.08, '#6d7767'); box(x - 2.6, 1.05, 54.5, 0.45, 0.3, 0.3, '#9e6953');
  }
  for (const [x,z] of [[-11,40],[14,32],[44,32],[53,53],[25,66],[-11,58]]) {
    box(x, terrainHeight(x,z)+1.8, z, 0.12, 3.6, 0.12, '#53695f');
    const bulb = new THREE.Mesh(cube, glow); bulb.position.set(x,terrainHeight(x,z)+3.7,z); bulb.scale.set(0.45,0.4,0.45); scene.add(bulb);
    const light = new THREE.PointLight('#ffcf8a', 0, 13, 2); light.position.copy(bulb.position); scene.add(light); lamps.push(light);
  }

  const walkers = Array.from({ length: 8 }, (_, i) => {
    const character = person(0, 0, ['#ad685b','#658e99','#c3a166','#788761','#9b83a1','#e0ccaa','#798fa8','#ba886b'][i], scene, i + 8);
    character.group.name = `resident-${i}`;
    if (i % 3 === 0) {
      box(0, 1.06, -0.26, 0.43, 0.55, 0.23, '#84674d', character.group);
      for (const x of [-0.2,0.2]) box(x,1.2,0.18,0.045,0.4,0.05,'#bda889',character.group);
    }
    if (i === 1 || i === 5) {
      const brim = box(0,1.92,0.02,0.57,0.05,0.47,'#d5b575',character.group);
      const hat = sphere(0,2.01,-0.02,0.23,0.14,0.22,'#d5b575',character.group); brim.castShadow = hat.castShadow = true;
    }
    if (i === 4) box(0.4,0.76,0.05,0.25,0.36,0.18,'#d8c4a0',character.group);
    batchMeshes(character.group); return character;
  });

  const cars = Array.from({ length: 3 }, (_, i) => {
    const group = new THREE.Group(); group.name = i === 0 ? 'delivery-van' : `town-car-${i}`; scene.add(group);
    const paint = ['#d5c8a7','#a45f4e','#648990'][i];
    box(0,0.65,0,1.65,0.65,3.3,paint,group); box(0,1.2,-0.3,1.48,i === 0 ? 0.95 : 0.6,1.95,paint,group);
    box(0,1.25,0.7,1.28,0.42,0.05,'#a6bbb5',group);
    for (const side of [-1,1]) {
      box(side*0.76,1.25,0.18,0.035,0.4,0.8,'#a6bbb5',group);
      box(side*0.9,1,0.7,0.19,0.12,0.22,paint,group);
      for (const z of [-1.03,1.03]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.18,10),new THREE.MeshStandardMaterial({color:'#354039',roughness:1}));
        wheel.rotation.z=Math.PI/2; wheel.position.set(side*0.82,0.36,z); group.add(wheel);
        sphere(side*0.93,0.36,z,0.02,0.13,0.13,'#8f998b',group);
      }
      const front = new THREE.Mesh(cube,headlights); front.position.set(side*0.55,0.74,1.68); front.scale.set(0.35,0.19,0.04); group.add(front);
      const rear = new THREE.Mesh(cube,tailLights); rear.position.set(side*0.55,0.7,-1.68); rear.scale.set(0.26,0.17,0.04); group.add(rear);
    }
    box(0,0.45,1.71,1.5,0.16,0.1,'#56675f',group);
    const beam = new THREE.SpotLight('#ffe4a6',0,18,0.42,0.65,2); beam.position.set(0,0.85,1.6); beam.target.position.set(0,0,14); group.add(beam,beam.target);
    batchMeshes(group);
    // Merged car meshes remain attached to the moving group for photo occlusion.
    
    return { group, beam, route: trafficRoutes[i % 2], start: i === 0 ? 5 : 7, end: i === 0 ? 24 : 21, phase: i * 49 };
  });
  // Two parked cars remain in driveways after the daytime traffic goes home.
  const parked = cars.slice(1).map((car,i) => {
    const group = car.group.clone(); group.name = `parked-car-${i}`;
    group.traverse(child => { if (child instanceof THREE.Light) child.visible = false; });
    group.position.set(17+i*13,0,66); group.rotation.y=Math.PI/2; scene.add(group);
     return group;
  });

  const quadruped = (name: string, colour: string, scale: number) => {
    const group = new THREE.Group(); group.name = name; group.scale.setScalar(scale); scene.add(group);
    sphere(0,0.64,0,0.27,0.28,0.55,colour,group);
    const head = new THREE.Group(); head.position.set(0,0.86,0.48); group.add(head);
    sphere(0,0,0,0.2,0.23,0.26,colour,head); sphere(0,-0.07,0.23,0.15,0.11,0.2,'#c9b393',head);
    sphere(0,-0.07,0.4,0.06,0.06,0.04,'#343e35',head);
    for (const x of [-0.12,0.12]) {
      sphere(x,0.03,0.18,0.025,0.03,0.035,'#293b32',head);
      const ear = box(x,0.25,0,0.09,0.24,0.12,colour,head); ear.rotation.z=x*2;
    }
    const legs = [-1,1].flatMap(x => [-1,1].map(z => {
      const leg = new THREE.Group(); leg.position.set(x*0.18,0.57,z*0.32); group.add(leg);
      box(0,-0.27,0,0.085,0.54,0.1,colour,leg); box(0,-0.54,0.035,0.1,0.07,0.15,'#514c3d',leg); batchMeshes(leg); return leg;
    }));
    const tail = box(0,0.76,-0.64,0.1,0.12,0.4,colour,group); tail.rotation.x=-0.4;
    batchMeshes(head); batchMeshes(group,new Set([tail])); return { group, legs, head, tail };
  };
  const dog = quadruped('village-dog','#b49569',0.65);
  const deer = [quadruped('meadow-deer-0','#b48d66',1.25),quadruped('meadow-deer-1','#c0a17b',0.95)];
  deer.forEach((animal,i) => {
    sphere(0,0.6,-0.45,0.16,0.18,0.15,'#e6d5b2',animal.group);
    if (i === 0) for (const x of [-0.14,0.14]) {
      box(x,0.4,-0.03,0.05,0.4,0.055,'#796954',animal.head);
      const tine=box(x*1.6,0.48,-0.03,0.04,0.2,0.04,'#796954',animal.head); tine.rotation.z=-x*2;
    }
  });
  const fox = quadruped('woodland-fox','#b86e45',0.75);
  fox.tail.scale.set(0.19,0.17,0.65);
  const deerRoute: Route = [[-68,57],[-72,60],[-77,62],[-73,58],[-68,57]];
  const foxRoute: Route = [[62,-28],[65,-32],[68,-36],[72,-32],[68,-27],[62,-28]];
  const ducks = Array.from({length:5},(_,i) => {
    const group=new THREE.Group(); group.name=`lake-duck-${i}`; scene.add(group);
    sphere(0,0.15,0,0.19,0.16,0.32,i%2?'#9b8868':'#d7c7a2',group);
    const head=new THREE.Group(); head.position.set(0,0.42,0.19); group.add(head);
    sphere(0,0,0,0.13,0.14,0.14,i%2?'#9b8868':'#4c7963',head);
    box(0,-0.035,0.16,0.11,0.035,0.15,'#d8a853',head);
    for (const x of [-0.1,0.1]) sphere(x,0.02,0.065,0.02,0.025,0.02,'#293a31',head);
    batchMeshes(head); batchMeshes(group); return { group,head };
  });

  const traffic = cars.map(car => car.group);
  let night = 0;
  return {
    traffic,
    dynamicSolids() { const meshes: THREE.Object3D[] = []; [...traffic,...parked].filter(g=>g.visible).forEach(g=>g.traverse(child=>{if(child instanceof THREE.Mesh) meshes.push(child);})); return meshes; },
    setTime(_hour: number, darkness: number) {
      night=darkness; lamps.forEach(lamp => { lamp.intensity=night*16; });
      glow.emissiveIntensity=night*1.3; headlights.emissiveIntensity=0.15+night*1.8; tailLights.emissiveIntensity=0.1+night;
    },
    update(time: number, hour: number) {
      walkers.forEach((character,i) => {
        const active=isActiveHour(hour,i===7?16:7,i===7?23:21);
        character.group.visible=active;
        const length=routeLength(townSidewalk), p=routePose(i%2?[...townSidewalk].reverse():townSidewalk,time*(i%3===0?0.65:0.9)+i*length/8);
        character.group.position.set(p.x,terrainHeight(p.x,p.z)+0.06,p.z); character.group.rotation.y=p.yaw;
        character.legs.forEach((leg,j)=>{leg.rotation.x=Math.sin(time*5+j*Math.PI+i)*0.33;});
        character.arms.forEach((arm,j)=>{arm.rotation.x=-Math.sin(time*5+j*Math.PI+i)*0.25;});
      });
      cars.forEach((car,i) => {
        car.group.visible=isActiveHour(hour,car.start,car.end);
        const route=i===1?[...car.route].reverse():car.route;
        const p=routePose(route,time*3.6+car.phase);
        car.group.position.set(p.x,terrainHeight(p.x,p.z)+0.07,p.z); car.group.rotation.y=p.yaw; car.beam.intensity=night*35;
        if (i>0) parked[i-1].visible=!car.group.visible;
      });
      const animateAnimal=(animal: ReturnType<typeof quadruped>, p: {x:number;z:number;yaw:number;walking:boolean}, grazing=false) => {
        animal.group.position.set(p.x,terrainHeight(p.x,p.z),p.z); animal.group.rotation.y=p.yaw;
        animal.legs.forEach((leg,i)=>{leg.rotation.x=p.walking?Math.sin(time*6+(i===0||i===3?0:Math.PI))*0.3:0;});
        animal.head.rotation.x=grazing&&!p.walking?0.9+Math.sin(time*1.8)*0.1:Math.sin(time*0.8)*0.08;
        animal.tail.rotation.y=Math.sin(time*4)*0.25;
      };
      dog.group.visible=walkers[0].group.visible;
      const walker=walkers[0].group; animateAnimal(dog,{x:walker.position.x-Math.sin(walker.rotation.y)*1.2,z:walker.position.z-Math.cos(walker.rotation.y)*1.2,yaw:walker.rotation.y,walking:true});
      deer.forEach((animal,i)=>{ const p=routinePose(deerRoute,hour+i*0.05,4,23,0.4,18); animateAnimal(animal,p,true); });
      fox.group.visible=isActiveHour(hour,19,6); animateAnimal(fox,routinePose(foxRoute,hour,19,6,0.7,12));
      ducks.forEach((duck,i)=>{
        const active=isActiveHour(hour,5,21), angle=time*0.13+i*0.6;
        const x=active?-10+Math.sin(angle)*3:-16+i*0.65, z=active?4+Math.cos(angle)*2:7.7;
        duck.group.position.set(x,0.13+Math.sin(time*2+i)*0.015,z); duck.group.rotation.y=active?Math.atan2(Math.cos(angle),-Math.sin(angle)):Math.PI;
        duck.head.rotation.x=active?Math.sin(time+i)*0.12:0.8;
      });
    },
    blocksWalking(x: number,z: number) {
      return [...traffic,...parked].some(car=>{
        if (!car.visible) return false;
        const dx=x-car.position.x,dz=z-car.position.z, c=Math.cos(car.rotation.y),s=Math.sin(car.rotation.y);
        return Math.abs(dx*c-dz*s)<1.1&&Math.abs(dx*s+dz*c)<2;
      });
    },
  };
}

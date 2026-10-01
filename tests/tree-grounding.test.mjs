import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.ts';
import { terrainSurfaceHeight } from '../src/terrain.ts';

const downward = new THREE.Vector3(0,-1,0);
test('tree placement samples the visible terrain triangles rather than the procedural height alone',()=>{
  const world=createWorld(),terrain=world.scene.getObjectByName('rolling-terrain');world.scene.updateMatrixWorld(true);
  for(const [x,z] of [[0.3,0.7],[-53.27,-76.61],[-82.91,60.23],[91.7,27.9],[177.3,43.9],[-143.2,-179.7],[-21.31,7.24],[-18.75,-5.4]]){
    const hit=new THREE.Raycaster(new THREE.Vector3(x,100,z),downward).intersectObject(terrain,false)[0];
    assert.ok(hit);assert.ok(Math.abs(hit.point.y-terrainSurfaceHeight(x,z))<0.00001,`surface mismatch at ${x}, ${z}`);
  }
});

test('every forest and broadleaf trunk penetrates the terrain across its entire base',()=>{
  const world=createWorld(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();let checked=0;
  for(const name of ['forest-trunks','broadleaf-trunks']){
    const root=world.scene.getObjectByName(name),batches=[];
    root.traverse(mesh=>{if(mesh.isInstancedMesh)batches.push(mesh);});
    for(const trunks of batches)for(let i=0;i<trunks.count;i++){
      trunks.getMatrixAt(i,matrix);
      for(const x of [-0.5,-0.25,0,0.25,0.5])for(const z of [-0.5,-0.25,0,0.25,0.5]){
        point.set(x,-0.5,z).applyMatrix4(matrix);
        assert.ok(point.y<terrainSurfaceHeight(point.x,point.z)-0.1,`${name} ${i} floats at ${point.toArray()}`);
      }
      checked++;
    }
  }
  assert.equal(checked,1707);
});

test('waterfall firs embed in the actual rock ledge under their bases',()=>{
  const world=createWorld(),cliff=world.scene.getObjectByName('waterfall-cliff');world.scene.updateMatrixWorld(true);
  const trunks=[];world.scene.traverse(object=>{if(object.name==='waterfall-fir-trunk')trunks.push(object);});assert.equal(trunks.length,4);
  for(const trunk of trunks){
    const vertices=trunk.geometry.getAttribute('position');let samples=0;
    for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<-0.49){
      const foot=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(trunk.matrixWorld);
      const hit=new THREE.Raycaster(new THREE.Vector3(foot.x,20,foot.z),downward).intersectObject(cliff,false)[0];
      assert.ok(hit,`no cliff beneath ${foot.toArray()}`);assert.ok(foot.y<hit.point.y-0.1,'fir base is exposed above its ledge');samples++;
    }
    assert.ok(samples>0);
  }
});

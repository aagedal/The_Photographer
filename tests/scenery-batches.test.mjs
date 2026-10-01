import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { partitionScenery } from '../src/scenery-batches.ts';

test('partitioned scenery preserves every transform/color and culls the offscreen cells', () => {
  const source = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 4);
  source.name = 'test-trees'; source.castShadow = source.receiveShadow = true;
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (const [i,x] of [-80,-70,70,80].entries()) {
    source.setMatrixAt(i,matrix.makeTranslation(x,2,0));source.setColorAt(i,color.setRGB(i/4,0.5,1));
  }
  const group = partitionScenery(source,64);
  assert.equal(group.children.length,2);
  const recovered=[];
  group.children.forEach(mesh=>{
    assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
    for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);mesh.getColorAt(i,color);recovered.push([matrix.elements[12],color.r]);}
  });
  assert.deepEqual(recovered,[[-80,0],[-70,0.25],[70,0.5],[80,0.75]]);
  group.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(45,1,0.1,120);camera.position.set(75,2,20);camera.lookAt(75,2,0);camera.updateMatrixWorld(true);
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  assert.equal(group.children.filter(mesh=>frustum.intersectsObject(mesh)).length,1);
});

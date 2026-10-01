import * as THREE from 'three';

/** Separate a procedural character before batching so faces and clothes move together. */
export function createIdleRig(group: THREE.Object3D, arms: THREE.Group[] = [], seated = false) {
  const torso = new THREE.Group(); torso.name = 'idle-torso'; torso.position.y = seated ? 0.6 : 0.78;
  const head = new THREE.Group(); head.name = 'idle-head'; head.position.y = 1.46 - torso.position.y;
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || child.name.startsWith('npc-marker-')) continue;
    if (child.position.y >= 1.5) {
      child.position.y -= 1.46; head.add(child);
    } else if (child.position.y > (seated ? 0.65 : 0.78)) {
      child.position.y -= torso.position.y; torso.add(child);
    }
  }
  for (const arm of arms) { arm.position.y -= torso.position.y; torso.add(arm); }
  torso.add(head); group.add(torso);
  return { torso, head, arms };
}
export type IdleRig = ReturnType<typeof createIdleRig>;

// Absolute time is essential: a long exposure can sample either side of the
// live frame and then restore every joint without accumulated simulation drift.
export function animateIdle(rig: IdleRig, time: number, phase: number, walking = false) {
  const t = time + phase * 2.37;
  const breath = Math.sin(t * 1.65);
  rig.torso.scale.y = 1 + breath * 0.009;
  rig.torso.rotation.z = Math.sin(t * 0.48) * (walking ? 0.008 : 0.018);
  rig.torso.rotation.x = Math.sin(t * 0.61 + 0.8) * 0.008;
  rig.head.rotation.y = Math.sin(t * 0.37) * 0.13 + Math.sin(t * 0.91) * 0.035;
  rig.head.rotation.x = Math.sin(t * 0.69 + 1) * 0.035;
  rig.head.rotation.z = Math.sin(t * 0.43 + 2) * 0.024;
  if (!walking) rig.arms.forEach((arm, side) => {
    // A gentle occasional gesture, staggered between neighbors.
    const gesture = Math.max(0, Math.sin(t * 0.23 + side * 2)) ** 12;
    arm.rotation.x = Math.sin(t * 0.8 + side * 1.8) * 0.065 - gesture * 0.24;
    arm.rotation.z = (side ? -1 : 1) * (0.035 + Math.sin(t * 0.6) * 0.015 + gesture * 0.06);
  });
}

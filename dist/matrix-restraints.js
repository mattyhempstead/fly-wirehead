import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { FLY_SCALE, FLY_X, FLY_Y } from './matrix-fly.js';

// Anatomical right is +Z; the hind leg is index 2 in the original fly model.
const knee = new THREE.Vector3(-1.03, -.37, .75), ankle = new THREE.Vector3(-.70, -.94, .99);
const cuffCenter = knee.clone().lerp(ankle, .66);
const attachment = cuffCenter.clone().add(new THREE.Vector3(0, 0, .17));
const anchor = new THREE.Vector3(-1.85, .16, 1.915);
const LINK_COUNT = 19;

export function createRestraints(scene, stations) {
  const steel = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .72, roughness: .32 });
  const chainSteel = new THREE.MeshStandardMaterial({ color: 0xa6b4bb, metalness: .76, roughness: .3 });
  const cuffRoot = new THREE.Group(), c = builders(cuffRoot);
  const band = new THREE.Group(); band.position.copy(cuffCenter);
  band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ankle.clone().sub(knee).normalize()); cuffRoot.add(band);
  const ring = new THREE.Shape(); ring.absarc(0, 0, .118, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, .031, 0, Math.PI * 2, true); ring.holes.push(hole);
  c.mesh(new THREE.ExtrudeGeometry(ring, { depth: .17, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1, curveSegments: 8, steps: 1 }), 0x9baeb4, [0, 0, -.085], band);
  for (const z of [-.083, .083]) c.mesh(new THREE.TorusGeometry(.113, .015, 5, 14), 0xd0dadc, [0, 0, z], band);
  c.box([.075, .095, .14], [.122, 0, 0], 0x354a54, band);
  for (const z of [-.052, .052]) c.orb([.023, .023, .017], [.16, 0, z], 0xd1dadd, band, 0);
  const eyelet = c.mesh(new THREE.TorusGeometry(.065, .021, 5, 12), 0x849ba5, attachment.toArray()); eyelet.rotation.y = Math.PI / 2;

  const plateRoot = new THREE.Group(), p = builders(plateRoot);
  p.box([.42, .085, .31], [anchor.x, .008, anchor.z], 0x445e69);
  p.box([.32, .022, .23], [anchor.x, .061, anchor.z], 0x9baeb0);
  const floorRing = p.mesh(new THREE.TorusGeometry(.083, .025, 6, 14), 0xb7c5c8, anchor.toArray()); floorRing.rotation.y = Math.PI / 2;
  for (const x of [-.145, .145]) for (const z of [-.10, .10]) {
    p.mesh(new THREE.CylinderGeometry(.025, .029, .032, 6), 0xc4cdce, [anchor.x + x, .061, anchor.z + z]);
  }
  function batch(geometry, material, count, dynamic = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = true;
    if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh); return mesh;
  }
  const cuffs = batch(bake(cuffRoot), steel, stations.length, true);
  const anchors = batch(bake(plateRoot), steel, stations.length);
  const links = batch(new THREE.TorusGeometry(.047, .014, 5, 12), chainSteel, stations.length * LINK_COUNT, true);
  const nominalAttachment = attachment.clone().multiplyScalar(FLY_SCALE).add(new THREE.Vector3(FLY_X, FLY_Y, 0));
  // Rest across the platform, clear its front edge, then drop to the actual floor.
  const curve = new THREE.CatmullRomCurve3([
    nominalAttachment,
    new THREE.Vector3(-1.46, .942, 1.02),
    new THREE.Vector3(-1.58, .935, 1.38),
    new THREE.Vector3(-1.68, .933, 1.77),
    new THREE.Vector3(-1.73, .75, 1.87),
    new THREE.Vector3(-1.81, .38, 1.91),
    anchor,
  ]);
  const length = curve.getLength(), samples = Array.from({ length: LINK_COUNT }, (_, i) => {
    const t = (i + .5) / LINK_COUNT;
    return { t, point: curve.getPointAt(t), tangent: curve.getTangentAt(t) };
  });
  const pose = new THREE.Object3D(), current = new THREE.Vector3(), delta = new THREE.Vector3(), tangent = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), twist = new THREE.Quaternion();
  for (const station of stations) {
    pose.position.set(station.x, 0, station.z); pose.updateMatrix(); anchors.setMatrixAt(station.id, pose.matrix);
  }
  anchors.instanceMatrix.needsUpdate = true;
  return {
    pose(station, bodyMatrix) {
      cuffs.setMatrixAt(station.id, bodyMatrix);
      current.copy(attachment).applyMatrix4(bodyMatrix).sub(new THREE.Vector3(station.x, 0, station.z));
      delta.copy(current).sub(nominalAttachment);
      for (let i = 0; i < LINK_COUNT; i++) {
        const sample = samples[i], weight = (1 - sample.t) ** 3;
        // The first links follow the cuff; the lower links and anchor stay fixed.
        pose.position.copy(sample.point).addScaledVector(delta, weight);
        pose.position.x += station.x; pose.position.z += station.z;
        tangent.copy(sample.tangent).addScaledVector(delta, -3 * (1 - sample.t) ** 2 / length).normalize();
        pose.quaternion.setFromUnitVectors(up, tangent);
        twist.setFromAxisAngle(up, i % 2 * Math.PI / 2); pose.quaternion.multiply(twist);
        pose.scale.set(1, 1.6, 1); pose.updateMatrix(); links.setMatrixAt(station.id * LINK_COUNT + i, pose.matrix);
      }
    },
    update() { cuffs.instanceMatrix.needsUpdate = links.instanceMatrix.needsUpdate = true; },
    count: stations.length,
  };
}

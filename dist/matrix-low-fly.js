import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { FLY_X, FLY_Y, FLY_SCALE, SOCKET } from './matrix-fly.js';
import { stations, STATION_COUNT } from './matrix-timeline.js';
import { wingbeatProfile } from './matrix-wingbeat.js';

// Same proportions and swept wing silhouette as the hero fly, without bristles,
// abdomen rings, or detailed restraints. One prototype serves every nearby room.
export function lowFlyGeometry() {
  const root = new THREE.Group(), b = builders(root);
  b.orb([.91, .39, .43], [-.83, -.02, 0], 0x203439, root, 0);
  b.orb([.66, .53, .5], [-.05, .08, 0], 0x354e55, root, 1);
  b.orb([.41, .4, .4], [.63, .19, 0], 0x50616a, root, 0);
  for (const side of [-1, 1]) {
    b.orb([.28, .37, .255], [.75, .23, side * .29], 0xab1336, root, 1);
    b.orb([.058, .04, .034], [.84, .44, side * .47], 0xf5c0b7, root, 0);
    b.rod([.88, .49, side * .15], [1.33, .76, side * .37], .019, 0x26373b, root, 3);
    for (let i = 0; i < 3; i++) {
      const x = .33 - i * .46;
      const a = [x, -.17, side * .3], knee = [x + .52 - i * .48, -.37, side * .75];
      const foot = [x + .59 - i * .35, -.94, side * .99];
      b.rod(a, knee, .043, 0x354b50, root, 3);
      b.rod(knee, foot, .029, 0x26373b, root, 3);
      b.rod(foot, [foot[0] + .24, -.96, foot[2] + side * .08], .019, 0x142429, root, 3);
    }
  }
  b.rod([.91, .02, 0], [1.14, -.16, 0], .045, 0x26373b, root, 3);
  b.mesh(new THREE.CylinderGeometry(.12, .15, .11, 6), 0x9abca3, [.63, .58, 0]);
  b.rod([.63, .64, 0], SOCKET, .045, 0x7e9988, root, 4);
  const body = bake(root);

  const wingRoot = new THREE.Group(), w = builders(wingRoot), sides = [], pivots = [];
  for (const side of [-1, 1]) {
    const group = new THREE.Group(); wingRoot.add(group);
    const pivot = [-.18, .41, side * .23]; group.position.set(...pivot);
    const points = [[0, 0, 0], [-.75, .07, .38 * side], [-1.72, .01, 1.1 * side], [-2.03, -.035, 1.05 * side], [-2.21, -.04, .83 * side], [-1.77, -.03, .41 * side], [-.66, -.015, .03 * side]];
    const vertices = [];
    for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const membrane = new THREE.BufferGeometry(); membrane.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); membrane.computeVertexNormals();
    w.mesh(membrane, 0xb4dce0, [0, 0, 0], group);
    for (const tip of [points[2], points[4]]) w.rod([0, 0, 0], tip, .013, 0x446e78, group, 3);
    group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const count = mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count;
      for (let i = 0; i < count; i++) { sides.push(side); pivots.push(...pivot); }
    });
  }
  const wings = bake(wingRoot);
  wings.setAttribute('wingSide', new THREE.Float32BufferAttribute(sides, 1));
  wings.setAttribute('wingPivot', new THREE.Float32BufferAttribute(pivots, 3));
  return { body, wings };
}

export function createLowFlies(root, rooms) {
  const geometry = lowFlyGeometry(), count = rooms.length * STATION_COUNT;
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x152622, emissiveIntensity: .3, fog: false, transparent: true });
  const wingMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, transparent: true, opacity: .65, side: THREE.DoubleSide, depthWrite: false });
  const clock = { value: 0 }, motor = { value: 0 };
  wingMaterial.onBeforeCompile = shader => {
    shader.uniforms.wingTime = clock; shader.uniforms.wingMotor = motor;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute float wingSide;
      attribute vec3 wingPivot;
      attribute vec3 wingMotion;
      uniform float wingTime;
      uniform float wingMotor;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float wingAngle = wingSide * sin(wingTime * wingMotion.y + wingMotion.x) * (.12 + wingMotor * .25) * wingMotion.z;
        mat2 wingRotation = mat2(cos(wingAngle), sin(wingAngle), -sin(wingAngle), cos(wingAngle));
        objectNormal.yz = wingRotation * objectNormal.yz;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.yz = wingPivot.yz + wingRotation * (transformed.yz - wingPivot.yz);`);
  };
  wingMaterial.customProgramCacheKey = () => 'matrix-independent-wingbeats-v1';
  const bodies = new THREE.InstancedMesh(geometry.body, material, count);
  const wings = new THREE.InstancedMesh(geometry.wings, wingMaterial, count);
  bodies.frustumCulled = wings.frustumCulled = false;
  bodies.renderOrder = 1; wings.renderOrder = 2; root.add(bodies, wings);
  const transform = new THREE.Object3D(), profiles = new Float32Array(count * 3);
  rooms.forEach((room, index) => stations.forEach(station => {
    const id = index * STATION_COUNT + station.id;
    transform.position.set(room.x + station.x + FLY_X, FLY_Y, room.z + station.z);
    // Room zero retains the original detailed flies throughout this tier.
    transform.scale.setScalar(index === 0 ? 0 : FLY_SCALE); transform.updateMatrix();
    bodies.setMatrixAt(id, transform.matrix); wings.setMatrixAt(id, transform.matrix);
    profiles.set(wingbeatProfile(room.id, station.id), id * 3);
  }));
  geometry.wings.setAttribute('wingMotion', new THREE.InstancedBufferAttribute(profiles, 3));
  return {
    update(roomCount, opacity, time, drive) {
      bodies.visible = wings.visible = opacity > 0;
      bodies.count = wings.count = Math.min(roomCount, rooms.length) * STATION_COUNT;
      material.opacity = opacity; wingMaterial.opacity = opacity * .65;
      clock.value = time; motor.value = drive;
    },
    get count() { return bodies.visible ? Math.max(0, bodies.count - STATION_COUNT) : 0; },
  };
}

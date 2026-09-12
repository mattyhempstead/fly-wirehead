import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { random, stations } from './matrix-timeline.js';
import { FLY_X, FLY_Y, FLY_SCALE } from './matrix-fly.js';
import { blocks, BLOCK_COUNT, BLOCK_SIZE, BLOCK_PITCH, CAMPUS_CENTER, DETAIL_SPAN, visibleBlockCount } from './matrix-scale.js';

export function createCampus(scene, room, screens) {
  const root = new THREE.Group(); scene.add(root);
  // One snapshot of the actual room replaces its detailed geometry at distance.
  // Half-float linear color avoids clipping lighting before final tone mapping.
  const snapshot = new THREE.WebGLRenderTarget(1024, 1024, {
    type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
  });
  const top = new THREE.OrthographicCamera(-32, 32, 32, -32, .1, 150);
  top.position.set(0, 100, 0); top.up.set(0, 0, -1); top.lookAt(0, 0, 0);
  const groundGeometry = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);
  groundGeometry.rotateX(-Math.PI / 2);
  const floors = new THREE.InstancedMesh(groundGeometry, new THREE.MeshBasicMaterial({ map: snapshot.texture, fog: false, transparent: true }), BLOCK_COUNT);
  floors.frustumCulled = false; root.add(floors);

  const shell = new THREE.Group(), s = builders(shell);
  s.box([64, .8, 64], [0, -.65, 0], 0x102519);
  s.box([61, 20, .3], [0, 9.75, -30.4], 0x112b1a);
  s.box([.3, 20, 62], [30.6, 9.75, 0], 0x152e1e);
  s.box([61, .24, .46], [0, 19.86, -30.4], 0x52794b);
  s.box([.46, .24, 62], [30.6, 19.86, 0], 0x52794b);
  // Small uninterrupted service lights make each room legible at district scale.
  s.box([58, .05, .14], [0, .025, 30.5], 0x6b9851);
  const shells = new THREE.InstancedMesh(bake(shell), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true }), BLOCK_COUNT);
  shells.frustumCulled = false; root.add(shells);
  // Nearby copies retain raised benches, phones, and fly silhouettes. Cap this
  // tier at 81 rooms, then fade it into the room snapshot as it becomes tiny.
  const nearRoot = new THREE.Group(), n = builders(nearRoot);
  for (const station of stations) {
    n.box([5.18, .15, 3.30], [station.x, .74, station.z], 0x263c2a);
    n.box([.11, 2.5, 1.47], [station.x + 1.12, 2.1, station.z], 0x0b1411);
    const fly = new THREE.Group(); fly.position.set(station.x + FLY_X, FLY_Y, station.z); fly.scale.setScalar(FLY_SCALE); nearRoot.add(fly);
    n.orb([.85, .35, .38], [-.58, -.10, 0], 0x18282a, fly, 0);
    n.orb([.51, .54, .49], [.02, .10, 0], 0x304746, fly, 0);
    n.orb([.34, .37, .35], [.63, .23, 0], 0x354f49, fly, 0);
    for (const side of [-1, 1]) {
      n.orb([.23, .31, .18], [.78, .26, side * .29], 0x871a32, fly, 0);
      const wing = n.mesh(new THREE.PlaneGeometry(1.5, .50), 0x71928b, [-.75, .60, side * .43], fly); wing.rotation.x = -Math.PI / 2;
    }
  }
  const nearGeometry = new THREE.InstancedMesh(bake(nearRoot), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true }), 81);
  const nearScreens = new THREE.InstancedMesh(screens.geometry, screens.material.clone(), 81);
  nearScreens.material.fog = false; nearScreens.material.transparent = true;
  nearGeometry.frustumCulled = nearScreens.frustumCulled = false;
  nearGeometry.renderOrder = nearScreens.renderOrder = 1;
  root.add(nearGeometry, nearScreens);
  const transform = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]; transform.position.set(block.x, 0, block.z); transform.updateMatrix();
    floors.setMatrixAt(i, transform.matrix); shells.setMatrixAt(i, transform.matrix);
    if (i < 81) { nearGeometry.setMatrixAt(i, transform.matrix); nearScreens.setMatrixAt(i, transform.matrix); }
    const shade = i === 0 ? 1 : .87 + random(block.id + 411) * .2;
    color.setRGB(shade, shade, shade); floors.setColorAt(i, color); shells.setColorAt(i, color);
  }
  const foundation = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK_PITCH * 100 + 30, BLOCK_PITCH * 100 + 30), new THREE.MeshBasicMaterial({ color: 0x020805, fog: false, transparent: true }));
  foundation.rotation.x = -Math.PI / 2; foundation.position.set(CAMPUS_CENTER[0], -1.2, CAMPUS_CENTER[2]); root.add(foundation);
  foundation.renderOrder = -2; floors.renderOrder = -1;
  root.visible = false;
  let ready = false, lastCapture = -Infinity, detail = true, previousDetail = null, renderedBlocks = 0;

  return {
    get ready() { return ready; },
    needsCapture(time, detailed) { return !ready || detailed && time - lastCapture >= 2; },
    capture(renderer, time) {
      const oldTarget = renderer.getRenderTarget(), oldFog = scene.fog, oldRoot = root.visible, oldRoom = room.visible;
      try {
        root.visible = false; room.visible = true; scene.fog = null;
        renderer.setRenderTarget(snapshot); renderer.render(scene, top);
        ready = true; lastCapture = time;
      } finally {
        renderer.setRenderTarget(oldTarget); scene.fog = oldFog; root.visible = oldRoot; room.visible = oldRoom;
      }
    },
    update(span, aspect, orbit) {
      detail = span < DETAIL_SPAN || !ready;
      const fade = THREE.MathUtils.smoothstep(span, 65, 95);
      room.visible = detail; root.visible = ready && fade > 0;
      for (const mesh of [floors, shells, foundation]) mesh.material.opacity = fade;
      const nearFade = fade * (1 - THREE.MathUtils.smoothstep(span, 350, 600));
      nearGeometry.visible = nearScreens.visible = nearFade > 0;
      nearGeometry.material.opacity = nearScreens.material.opacity = nearFade;
      renderedBlocks = visibleBlockCount(span, aspect, orbit.phi, orbit.target);
      floors.count = shells.count = renderedBlocks;
      nearGeometry.count = nearScreens.count = Math.min(81, renderedBlocks);
      // The central block is either the real room or its proxy, never both.
      if (detail !== previousDetail) {
        transform.position.set(0, 0, 0); transform.scale.setScalar(detail ? 0 : 1); transform.updateMatrix();
        floors.setMatrixAt(0, transform.matrix); shells.setMatrixAt(0, transform.matrix);
        nearGeometry.setMatrixAt(0, transform.matrix); nearScreens.setMatrixAt(0, transform.matrix);
        floors.instanceMatrix.needsUpdate = shells.instanceMatrix.needsUpdate = true;
        nearGeometry.instanceMatrix.needsUpdate = nearScreens.instanceMatrix.needsUpdate = true;
        previousDetail = detail;
      }
    },
    stats() { return { blocks: BLOCK_COUNT, renderedBlocks, detailedRooms: detail ? 1 : 0 }; },
    dispose() { snapshot.dispose(); }
  };
}

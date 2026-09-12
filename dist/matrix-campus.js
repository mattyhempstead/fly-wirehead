import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { stations } from './matrix-timeline.js';
import { createLowFlies } from './matrix-low-fly.js';
import { blocks, rooms, ROOM_COUNT, ROOMS_PER_BLOCK, ROOM_SIZE, ROOM_WALL_HEIGHT, BLOCK_COUNT, BLOCK_SIZE, CAMPUS_SIZE, CAMPUS_CENTER, DETAIL_SPAN, visibleRoomCount, visibleBlockCount, revealOpacity } from './matrix-scale.js';

export function createCampus(scene, room, screens, originalWalls) {
  const root = new THREE.Group(); scene.add(root);
  // One snapshot of the actual room replaces its detailed geometry at distance.
  // Half-float linear color avoids clipping lighting before final tone mapping.
  const snapshot = new THREE.WebGLRenderTarget(1024, 1024, {
    type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
  });
  const top = new THREE.OrthographicCamera(-32, 32, 32, -32, .1, 150);
  top.position.set(0, 100, 0); top.up.set(0, 0, -1); top.lookAt(0, 0, 0);
  const groundGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  groundGeometry.rotateX(-Math.PI / 2);
  function instances(geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false; root.add(mesh); return mesh;
  }
  const floorMaterial = new THREE.MeshBasicMaterial({ map: snapshot.texture, fog: false, transparent: true });
  const floors = instances(groundGeometry, floorMaterial, ROOMS_PER_BLOCK);
  const outerFloors = instances(groundGeometry, floorMaterial.clone(), ROOM_COUNT - ROOMS_PER_BLOCK);

  const shell = new THREE.Group(), s = builders(shell);
  s.box([64, .8, 64], [0, -.65, 0], 0x102519);
  const wallY = ROOM_WALL_HEIGHT / 2 - .25, capY = ROOM_WALL_HEIGHT - .14;
  s.box([61, ROOM_WALL_HEIGHT, .3], [0, wallY, -30.4], 0x112b1a);
  s.box([.3, ROOM_WALL_HEIGHT, 62], [30.6, wallY, 0], 0x152e1e);
  s.box([61, .24, .46], [0, capY, -30.4], 0x52794b);
  s.box([.46, .24, 62], [30.6, capY, 0], 0x52794b);
  // Small uninterrupted service lights make each room legible at district scale.
  s.box([58, .05, .14], [0, .025, 30.5], 0x6b9851);
  const shellGeometry = bake(shell), shellMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true });
  const shells = instances(shellGeometry, shellMaterial, ROOMS_PER_BLOCK);
  const outerShells = instances(shellGeometry, shellMaterial.clone(), ROOM_COUNT - ROOMS_PER_BLOCK);

  // Wide service roads and a low outlined plinth make 100-room blocks readable
  // at the second reveal, without adding another set of obstructing walls.
  const blockRoot = new THREE.Group(), p = builders(blockRoot), halfBlock = BLOCK_SIZE / 2;
  p.box([BLOCK_SIZE, .7, BLOCK_SIZE], [0, -1.35, 0], 0x11251a);
  for (const side of [-1, 1]) {
    p.box([BLOCK_SIZE - 2, .055, 1.1], [0, -.972, side * (halfBlock - 1)], 0x5c8059);
    p.box([1.1, .055, BLOCK_SIZE - 2], [side * (halfBlock - 1), -.972, 0], 0x5c8059);
  }
  const blockGeometry = bake(blockRoot), blockMaterial = shellMaterial.clone();
  const primaryBlock = instances(blockGeometry, blockMaterial, 1);
  const outerBlocks = instances(blockGeometry, blockMaterial.clone(), BLOCK_COUNT - 1);
  // Nearby rooms keep recognizable, animated 3D flies. The instanced tier is
  // bounded so the full campus still uses the inexpensive room snapshots.
  const nearRoot = new THREE.Group(), n = builders(nearRoot);
  for (const station of stations) {
    n.box([5.18, .15, 3.30], [station.x, .74, station.z], 0x263c2a);
    n.box([3, .022, 2.65], [station.x - .76, .855, station.z], 0x54715a);
    n.box([.11, 2.5, 1.47], [station.x + 1.12, 2.1, station.z], 0x0b1411);
  }
  const nearGeometry = new THREE.InstancedMesh(bake(nearRoot), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true }), 81);
  const nearScreens = new THREE.InstancedMesh(screens.geometry, screens.material.clone(), 81);
  nearScreens.material.fog = false; nearScreens.material.transparent = true;
  nearGeometry.frustumCulled = nearScreens.frustumCulled = false;
  nearGeometry.renderOrder = nearScreens.renderOrder = 1;
  root.add(nearGeometry, nearScreens);
  const nearFlies = createLowFlies(root, rooms.slice(0, 81));
  const transform = new THREE.Object3D();
  for (let i = 0; i < rooms.length; i++) {
    const copy = rooms[i]; transform.position.set(copy.x, 0, copy.z); transform.updateMatrix();
    const local = i < ROOMS_PER_BLOCK, index = local ? i : i - ROOMS_PER_BLOCK;
    const floorBatch = local ? floors : outerFloors, shellBatch = local ? shells : outerShells;
    floorBatch.setMatrixAt(index, transform.matrix); shellBatch.setMatrixAt(index, transform.matrix);
    if (i < 81) { nearGeometry.setMatrixAt(i, transform.matrix); nearScreens.setMatrixAt(i, transform.matrix); }
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]; transform.position.set(block.x, 0, block.z); transform.updateMatrix();
    (i === 0 ? primaryBlock : outerBlocks).setMatrixAt(i === 0 ? 0 : i - 1, transform.matrix);
  }
  const foundation = new THREE.Mesh(new THREE.PlaneGeometry(CAMPUS_SIZE + 60, CAMPUS_SIZE + 60), new THREE.MeshBasicMaterial({ color: 0x020805, fog: false, transparent: true }));
  foundation.rotation.x = -Math.PI / 2; foundation.position.set(CAMPUS_CENTER[0], -1.75, CAMPUS_CENTER[2]); root.add(foundation);
  foundation.renderOrder = -3; primaryBlock.renderOrder = outerBlocks.renderOrder = -2;
  floors.renderOrder = outerFloors.renderOrder = -1;
  root.visible = false;
  let ready = false, lastCapture = -Infinity, detail = true, previousDetail = null, renderedRooms = 0, renderedBlocks = 0;

  return {
    get ready() { return ready; },
    needsCapture(time, detailed) { return !ready || detailed && time - lastCapture >= 2; },
    capture(renderer, time) {
      const oldTarget = renderer.getRenderTarget(), oldFog = scene.fog, oldRoot = root.visible, oldRoom = room.visible;
      const oldWallOpacity = originalWalls.material.opacity;
      try {
        root.visible = false; room.visible = true; scene.fog = null;
        // Capture full wall color; each displayed room applies the reveal fade once.
        originalWalls.material.opacity = 1;
        renderer.setRenderTarget(snapshot); renderer.render(scene, top);
        ready = true; lastCapture = time;
      } finally {
        renderer.setRenderTarget(oldTarget); scene.fog = oldFog; root.visible = oldRoot; room.visible = oldRoom;
        originalWalls.material.opacity = oldWallOpacity;
      }
    },
    update(span, aspect, orbit, time, motor) {
      detail = span < DETAIL_SPAN || !ready;
      const fade = revealOpacity(span, orbit);
      originalWalls.material.opacity = fade.rooms;
      room.visible = detail; root.visible = ready;
      for (const mesh of [floors, shells, primaryBlock, foundation]) {
        mesh.visible = fade.rooms > 0;
        mesh.material.opacity = fade.rooms;
      }
      for (const mesh of [outerFloors, outerShells, outerBlocks]) {
        mesh.visible = fade.blocks > 0;
        mesh.material.opacity = fade.blocks;
      }
      const nearFade = fade.rooms * (1 - THREE.MathUtils.smoothstep(span, 450, 750));
      nearGeometry.visible = nearScreens.visible = nearFade > 0;
      nearGeometry.material.opacity = nearScreens.material.opacity = nearFade;
      const roomCount = visibleRoomCount(span, aspect, orbit.phi, orbit.target);
      floors.count = shells.count = Math.min(ROOMS_PER_BLOCK, roomCount);
      outerFloors.count = outerShells.count = Math.max(0, roomCount - ROOMS_PER_BLOCK);
      outerBlocks.count = Math.max(0, visibleBlockCount(span, aspect, orbit.phi, orbit.target) - 1);
      nearGeometry.count = nearScreens.count = Math.min(81, roomCount);
      nearFlies.update(roomCount, nearFade, time, motor);
      renderedRooms = root.visible ? (fade.rooms > 0 ? floors.count : 1) + outerFloors.count : 1;
      renderedBlocks = root.visible && fade.blocks > 0 ? outerBlocks.count + 1 : 1;
      // The central room is either the real geometry or its proxy, never both.
      if (detail !== previousDetail) {
        transform.position.set(0, 0, 0); transform.scale.setScalar(detail ? 0 : 1); transform.updateMatrix();
        floors.setMatrixAt(0, transform.matrix); shells.setMatrixAt(0, transform.matrix);
        nearGeometry.setMatrixAt(0, transform.matrix); nearScreens.setMatrixAt(0, transform.matrix);
        floors.instanceMatrix.needsUpdate = shells.instanceMatrix.needsUpdate = true;
        nearGeometry.instanceMatrix.needsUpdate = nearScreens.instanceMatrix.needsUpdate = true;
        previousDetail = detail;
      }
    },
    stats() { return { rooms: ROOM_COUNT, roomsPerBlock: ROOMS_PER_BLOCK, blocks: BLOCK_COUNT, renderedRooms, renderedBlocks, detailedRooms: detail ? 1 : 0, animatedReplicaFlies: nearFlies.count }; },
    dispose() { snapshot.dispose(); }
  };
}

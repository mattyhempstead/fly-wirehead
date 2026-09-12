import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from '../dist/vendor/three.module.js';
import { blocks, rooms, ROOM_COUNT, ROOMS_PER_BLOCK, ROOM_PITCH, ROOM_SIZE, ROOM_WALL_HEIGHT, BLOCK_COUNT, BLOCK_PITCH, BLOCK_SIZE, BLOCK_SPAN, CAMPUS_CENTER, CAMPUS_SIZE, CAMPUS_SPAN, REPRESENTED_FLIES, visibleRoomCount, visibleBlockCount, revealOpacity } from '../dist/matrix-scale.js';
import { createOrbitCamera, REVEAL_DURATION } from '../dist/matrix-camera.js';

test('100 blocks each contain a unique 10 by 10 room grid, representing 960,000 flies', () => {
  assert.equal(BLOCK_COUNT, 100);
  assert.equal(ROOM_COUNT, 10000);
  assert.equal(REPRESENTED_FLIES, 960000);
  assert.equal(new Set(blocks.map(b => `${b.x},${b.z}`)).size, BLOCK_COUNT);
  assert.equal(new Set(blocks.map(b => b.column)).size, 10);
  assert.equal(new Set(blocks.map(b => b.row)).size, 10);
  assert.equal(new Set(rooms.map(r => `${r.x},${r.z}`)).size, ROOM_COUNT);
  for (const block of blocks) {
    const contents = rooms.filter(room => room.blockId === block.id);
    assert.equal(contents.length, ROOMS_PER_BLOCK);
    assert.equal(new Set(contents.map(r => r.column)).size, 10);
    assert.equal(new Set(contents.map(r => r.row)).size, 10);
    for (const room of contents) {
      assert.ok(Math.abs(room.x - block.x) + ROOM_SIZE / 2 < BLOCK_SIZE / 2);
      assert.ok(Math.abs(room.z - block.z) + ROOM_SIZE / 2 < BLOCK_SIZE / 2);
    }
  }
  assert.equal(rooms[0].x, 0); assert.equal(rooms[0].z, 0);
  assert.ok(rooms.slice(0, ROOMS_PER_BLOCK).every(room => room.blockId === blocks[0].id));
  assert.ok(rooms.slice(ROOMS_PER_BLOCK).every(room => room.blockId !== blocks[0].id));
  assert.equal(blocks[0].ring, 0);
  for (const items of [blocks, rooms]) for (let i = 1; i < items.length; i++) assert.ok(items[i].ring >= items[i - 1].ring);
  assert.ok(ROOM_PITCH > ROOM_SIZE);
  assert.ok(BLOCK_PITCH > BLOCK_SIZE);
  assert.ok(BLOCK_PITCH - BLOCK_SIZE > ROOM_PITCH - ROOM_SIZE, 'narrow service roads still distinguish the second grid');
});

test('the room neighbourhood grows with the camera and is bounded at 10,000 instances', () => {
  let previous = 0;
  for (const span of [4, 40, 80, 200, 600, 2000, 5000, 10000, 20000]) {
    const count = visibleRoomCount(span, 1.2, .65, CAMPUS_CENTER);
    assert.ok(count >= previous && count <= ROOM_COUNT);
    previous = count;
  }
  assert.ok(visibleRoomCount(5, 1.2, 1.22) < 100);
  assert.equal(previous, ROOM_COUNT);
  assert.equal(visibleBlockCount(CAMPUS_SPAN, 16 / 9, 1.1, CAMPUS_CENTER), BLOCK_COUNT);
});

test('vertical camera panning keeps the rooms under the viewing ray rendered', () => {
  const phi = 1.1;
  for (const height of [-400, 400]) {
    const target = [0, height, 0], groundZ = -height * Math.tan(phi);
    const closest = rooms.reduce((best, room) => Math.hypot(room.x, room.z - groundZ) < Math.hypot(best.x, best.z - groundZ) ? room : best);
    assert.ok(rooms.indexOf(closest) < visibleRoomCount(200, 1.2, phi, target));
  }
});

test('rooms fade in gradually, then the outer grid appears immediately at full opacity', () => {
  assert.equal(revealOpacity(28).rooms, 0);
  assert.ok(revealOpacity(40).rooms > 0);
  assert.ok(revealOpacity(65).rooms < .5, 'fade spans a wider range than the previous 65–95 interval');
  assert.equal(revealOpacity(110).rooms, 1);
  assert.deepEqual(revealOpacity(BLOCK_SPAN), { rooms: 1, blocks: 0 }, 'the complete first 10 by 10 grid is revealed on its own');
  assert.equal(revealOpacity(899.99).blocks, 0);
  assert.equal(revealOpacity(900).blocks, 1);
  assert.equal(revealOpacity(900.01).blocks, 1);
  assert.equal(revealOpacity(1350).blocks, 1);
  assert.equal(revealOpacity(1800).blocks, 1);
  let previous = revealOpacity(0);
  for (let span = 1; span <= CAMPUS_SPAN; span++) {
    const current = revealOpacity(span);
    assert.ok(current.rooms >= previous.rooms && current.rooms <= 1);
    assert.ok(current.rooms - previous.rooms < .02, 'neighbouring rooms retain their gradual fade');
    assert.ok(current.blocks === 0 || current.blocks === 1, 'the outer grid is never partially faded');
    previous = current;
  }
});

test('the continuous reveal passes one room, 100 rooms, and all 100 blocks without stopping', () => {
  const views = [
    { theta: -.66, phi: 1.10, span: 68, target: [0, 1, 0] },
    { theta: -.85, phi: 1.13, span: 12, target: [-8, 1.5, 18.75] },
    { theta: -.5831104771069833, phi: .9205223878162124, span: 3.192613020328341, target: [2.1668115331565763, 1.772113300327674, 1.9304575839213705] },
    { theta: -.55, phi: 1.10, span: CAMPUS_SPAN, target: [...CAMPUS_CENTER] },
  ];
  const controls = createOrbitCamera(views); controls.startReveal();
  let previous = controls.snapshot(), atRoom, atBlock;
  const cruiseSpeeds = [];
  for (let i = 1; i <= REVEAL_DURATION * 100 + 1; i++) {
    const current = controls.step(.01);
    assert.ok(current.span >= previous.span - 1e-9);
    assert.ok(Math.abs(Math.log(current.span / previous.span)) < .006);
    if (!atRoom && current.span >= views[0].span) atRoom = current;
    if (!atBlock && current.span >= BLOCK_SPAN) atBlock = current;
    // This range includes both sides of the old 11-second room handoff.
    if (i >= 400 && i <= 2700) cruiseSpeeds.push(Math.log(current.span / previous.span) / .01);
    assert.ok(current.phi >= views[2].phi && current.phi <= views[3].phi, 'blend from the chosen angle toward the lower wide view');
    previous = current;
  }
  assert.ok(atRoom.span >= 68 && atRoom.span < 68.3);
  assert.ok(atRoom.reveal, 'the reveal must keep going after one room');
  assert.ok(atBlock.reveal.elapsed > atRoom.reveal.elapsed);
  assert.ok(atBlock.reveal, 'the reveal must keep going after 100 rooms');
  assert.equal(revealOpacity(atBlock.span).blocks, 0, 'the first block is visible before the outer grid appears');
  assert.ok(Math.min(...cruiseSpeeds) > .2, 'no slow section or pause in the middle');
  assert.ok(Math.max(...cruiseSpeeds) - Math.min(...cruiseSpeeds) < 1e-9, 'constant proportional pullback speed');
  assert.deepEqual(controls.snapshot(), { ...views[3], zoom: 1, view: 3, reveal: null });
  controls.startReveal();
  assert.equal(controls.snapshot().span, views[2].span);
  assert.deepEqual(controls.snapshot().target, views[2].target, 'replay restores the chosen pan');
  assert.equal(controls.snapshot().theta, views[2].theta);
  assert.equal(controls.snapshot().phi, views[2].phi);
});

test('the entire campus stays inside the final frame on portrait and landscape screens', () => {
  const min = CAMPUS_CENTER[0] - CAMPUS_SIZE / 2, max = CAMPUS_CENTER[0] + CAMPUS_SIZE / 2;
  for (const aspect of [.5, 1.15, 16 / 9, 2.4]) {
    const span = CAMPUS_SPAN * Math.max(1, 1.48 / aspect), radius = span * 1.4;
    const camera = new OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, radius + span * 2);
    camera.position.set(CAMPUS_CENTER[0] + radius * Math.sin(1.10) * Math.sin(-.55), radius * Math.cos(1.10), CAMPUS_CENTER[2] + radius * Math.sin(1.10) * Math.cos(-.55));
    camera.lookAt(...CAMPUS_CENTER); camera.updateMatrixWorld();
    for (const x of [min, max]) for (const z of [min, max]) for (const y of [0, ROOM_WALL_HEIGHT]) {
      const p = new Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(p.x) < .95 && Math.abs(p.y) < .95 && Math.abs(p.z) < 1, `clipped at aspect ${aspect}`);
    }
  }
});

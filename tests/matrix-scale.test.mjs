import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from '../dist/vendor/three.module.js';
import { blocks, BLOCK_COUNT, BLOCK_PITCH, BLOCK_SIZE, CAMPUS_CENTER, CAMPUS_SPAN, REPRESENTED_FLIES, visibleBlockCount } from '../dist/matrix-scale.js';
import { createOrbitCamera, REVEAL_ROOM_TIME, REVEAL_DURATION } from '../dist/matrix-camera.js';

test('the campus contains exactly 100 by 100 unique blocks and 960,000 represented flies', () => {
  assert.equal(BLOCK_COUNT, 10000);
  assert.equal(REPRESENTED_FLIES, 960000);
  assert.equal(new Set(blocks.map(b => `${b.x},${b.z}`)).size, 10000);
  assert.equal(new Set(blocks.map(b => b.column)).size, 100);
  assert.equal(new Set(blocks.map(b => b.row)).size, 100);
  assert.equal(blocks.filter(b => b.x === 0 && b.z === 0).length, 1);
  assert.equal(blocks[0].ring, 0);
  for (let i = 1; i < blocks.length; i++) assert.ok(blocks[i].ring >= blocks[i - 1].ring);
  assert.ok(BLOCK_PITCH > BLOCK_SIZE);
});

test('the room neighbourhood grows with the camera and is bounded at 10,000 instances', () => {
  let previous = 0;
  for (const span of [4, 40, 80, 200, 600, 2000, 5000, 10000, 20000]) {
    const count = visibleBlockCount(span, 1.2, .65, CAMPUS_CENTER);
    assert.ok(count >= previous && count <= BLOCK_COUNT);
    previous = count;
  }
  assert.ok(visibleBlockCount(5, 1.2, 1.22) < 100);
  assert.equal(previous, BLOCK_COUNT);
});

test('the extended reveal reaches the room first, continues to the campus, and stops exactly', () => {
  const views = [
    { theta: -.66, phi: .86, span: 68, target: [0, 1, 0] },
    { theta: -.85, phi: 1.13, span: 12, target: [-8, 1.5, 18.75] },
    { theta: -2.42, phi: .97, span: 3.35, target: [2.65, 1.85, 1.875] },
    { theta: -.55, phi: .48, span: CAMPUS_SPAN, target: [...CAMPUS_CENTER] },
  ];
  const controls = createOrbitCamera(views); controls.startReveal();
  let previous = controls.snapshot(), atRoom;
  for (let i = 1; i <= REVEAL_DURATION * 100 + 1; i++) {
    const current = controls.step(.01);
    assert.ok(current.span >= previous.span - 1e-9);
    assert.ok(Math.abs(Math.log(current.span / previous.span)) < .006);
    if (i === REVEAL_ROOM_TIME * 100) atRoom = current;
    previous = current;
  }
  assert.ok(Math.abs(atRoom.span - 68) < 1e-8);
  assert.ok(atRoom.reveal, 'the reveal must keep going after one room');
  assert.deepEqual(controls.snapshot(), { ...views[3], zoom: 1, view: 3, reveal: null });
  controls.startReveal();
  assert.equal(controls.snapshot().span, 3.35);
});

test('the entire campus stays inside the final frame on portrait and landscape screens', () => {
  const min = -50 * BLOCK_PITCH - BLOCK_SIZE / 2, max = 49 * BLOCK_PITCH + BLOCK_SIZE / 2;
  for (const aspect of [.5, 1.15, 1.8, 2.4]) {
    const span = CAMPUS_SPAN * Math.max(1, 1.48 / aspect), radius = span * 1.4;
    const camera = new OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, radius + span * 2);
    camera.position.set(CAMPUS_CENTER[0] + radius * Math.sin(.48) * Math.sin(-.55), radius * Math.cos(.48), CAMPUS_CENTER[2] + radius * Math.sin(.48) * Math.cos(-.55));
    camera.lookAt(...CAMPUS_CENTER); camera.updateMatrixWorld();
    for (const x of [min, max]) for (const z of [min, max]) for (const y of [0, 20]) {
      const p = new Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(p.x) < .95 && Math.abs(p.y) < .95 && Math.abs(p.z) < 1, `clipped at aspect ${aspect}`);
    }
  }
});

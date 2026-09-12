import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from '../dist/vendor/three.module.js';
import { createOrbitCamera, bindOrbitInput, REVEAL_DURATION } from '../dist/matrix-camera.js';

const views = [
  { theta: -.66, phi: .94, span: 42, target: [0, 1, 0] },
  { theta: -.85, phi: 1.13, span: 12, target: [-8, 1.5, 11.25] },
  { theta: -.64, phi: 1.22, span: 5.4, target: [-19.9, 1.7, 13.125] },
];
function project(pose, point) {
  const camera = new OrthographicCamera(-21, 21, 21, -21, .1, 200);
  camera.position.set(
    pose.target[0] + 72 * Math.sin(pose.phi) * Math.sin(pose.theta),
    pose.target[1] + 72 * Math.cos(pose.phi),
    pose.target[2] + 72 * Math.sin(pose.phi) * Math.cos(pose.theta));
  camera.lookAt(...pose.target); camera.updateMatrixWorld();
  return new Vector3(...point).project(camera);
}

test('dragging right and down carries the near side of the scene right and down at every heading', () => {
  for (const theta of [-3, -1.4, 0, 1.4, 3]) {
    const controls = createOrbitCamera([{ ...views[0], theta }]);
    const point = [3 * Math.sin(theta), 1, 3 * Math.cos(theta)];
    const before = project(controls.snapshot(), point);
    controls.orbit(40, 30, 800);
    const after = project(controls.step(1 / 60), point);
    assert.ok(after.x > before.x, 'right drag must move the near surface right');
    assert.ok(after.y < before.y, 'down drag must move the near surface down in screen coordinates');
  }
});

test('dragging interrupts a preset at its displayed pose and leaves no camera drift', () => {
  const controls = createOrbitCamera(views);
  controls.setView(2); controls.step(.05);
  const before = controls.snapshot(); controls.beginOrbit();
  assert.deepEqual(controls.step(.05), before);
  controls.orbit(60, -20, 800);
  const dragged = controls.snapshot();
  assert.deepEqual(dragged.target, before.target);
  assert.equal(dragged.span, before.span);
  for (let i = 0; i < 120; i++) assert.deepEqual(controls.step(1 / 60), dragged);
});

test('drag sensitivity follows viewport size and becomes gentler in close views and when zoomed in', () => {
  const angle = (height, pixels, zoom = 0, initial = views[0]) => {
    const controls = createOrbitCamera([initial]); controls.zoom(zoom);
    controls.orbit(pixels, 0, height);
    return Math.abs(controls.snapshot().theta - initial.theta);
  };
  assert.ok(Math.abs(angle(600, 60) - angle(1200, 120)) < 1e-12);
  assert.ok(angle(600, 60, -1000) < angle(600, 60));
  assert.ok(angle(600, 60, 0, views[2]) < angle(600, 60));
});

test('panning moves the scene by the dragged pixels at every heading, scale, zoom, and aspect', () => {
  for (const theta of [-3, -1.4, 0, 1.4, 3]) for (const phi of [.5, 1.25]) {
    for (const span of [5.4, 68, 7400]) for (const width of [400, 1440]) for (const zoom of [1, 3]) {
      const height = 800, controls = createOrbitCamera([{ ...views[0], theta, phi, span }]);
      controls.zoom(-Math.log(zoom) / .001);
      const before = controls.snapshot(), point = [...before.target];
      function pixels(pose) {
        const aspect = width / height, fitted = pose.span * Math.max(1, 1.48 / aspect) / pose.zoom;
        const camera = new OrthographicCamera(-fitted * aspect / 2, fitted * aspect / 2, fitted / 2, -fitted / 2, .1, 30000);
        const radius = Math.max(72, fitted * 1.4);
        camera.position.set(pose.target[0] + radius * Math.sin(phi) * Math.sin(theta), pose.target[1] + radius * Math.cos(phi), pose.target[2] + radius * Math.sin(phi) * Math.cos(theta));
        camera.lookAt(...pose.target); camera.updateMatrixWorld();
        const p = new Vector3(...point).project(camera);
        return [p.x * width / 2, -p.y * height / 2];
      }
      const first = pixels(before);
      controls.pan(120, 65, height, width);
      const after = controls.snapshot(), second = pixels(after);
      assert.ok(Math.abs(second[0] - first[0] - 120) < 1e-8);
      assert.ok(Math.abs(second[1] - first[1] - 65) < 1e-8);
      for (const key of ['theta', 'phi', 'span', 'zoom']) assert.equal(after[key], before[key]);
    }
  }
});

test('pan cancels a reveal at the displayed pose, has no drift, and recenters without changing zoom or angle', () => {
  const controls = createOrbitCamera(views); controls.startReveal();
  for (let i = 0; i < 300; i++) controls.step(1 / 60);
  const anchor = controls.snapshot();
  controls.pan(70, -30, 800, 1200);
  const panned = controls.snapshot();
  assert.equal(panned.reveal, null);
  assert.notDeepEqual(panned.target, anchor.target);
  for (let i = 0; i < 120; i++) assert.deepEqual(controls.step(1 / 60, true), panned);
  controls.pan(-15, 40, 800, 1200);
  controls.zoom(-200); controls.orbit(20, 10, 800);
  const angled = controls.snapshot(); controls.resetPan();
  assert.deepEqual(controls.snapshot().target, anchor.target);
  for (const key of ['theta', 'phi', 'span', 'zoom']) assert.equal(controls.snapshot()[key], angled[key]);
  controls.pan(10, 10, 800, 1200); controls.setView(0);
  for (let i = 0; i < 300; i++) controls.step(1 / 60);
  const preset = controls.snapshot(); controls.resetPan();
  assert.deepEqual(controls.snapshot(), preset, 'a preset clears the previous pan anchor');
});

test('preset resets take the shortest turn and smoothly restore zoom without an initial jump', () => {
  const controls = createOrbitCamera([{ ...views[0], theta: -Math.PI + .04 }]);
  controls.orbit(30, 0, 600); controls.zoom(-800);
  const before = controls.snapshot();
  assert.ok(before.theta > 3);
  controls.setView(0);
  assert.deepEqual(controls.snapshot(), before);
  const next = controls.step(1 / 60);
  const turn = Math.atan2(Math.sin(next.theta - before.theta), Math.cos(next.theta - before.theta));
  assert.ok(turn > 0 && turn < .05);
  assert.ok(next.zoom < before.zoom && next.zoom > 1);
});

test('large drags and wheel deltas stay upright, bounded, and finite', () => {
  const controls = createOrbitCamera(views);
  for (const sign of [-1, 1]) {
    controls.orbit(sign * 1e6, sign * 1e6, 600); controls.zoom(sign * 1e6);
    const pose = controls.step(.05);
    assert.ok(Math.abs(pose.theta) <= Math.PI);
    assert.ok(pose.phi >= .35 && pose.phi <= 1.45);
    assert.ok(pose.zoom >= .65 && pose.zoom <= 4);
  }
});

test('reveal holds on one fly, pulls back continuously, and stops exactly at the full factory', () => {
  const controls = createOrbitCamera(views), start = { ...views[2], span: 3.35 };
  controls.startReveal(start);
  const opening = controls.snapshot();
  for (let i = 0; i < 60; i++) controls.step(1 / 60);
  assert.equal(controls.snapshot().span, opening.span);
  assert.deepEqual(controls.snapshot().target, opening.target);
  let previous = controls.snapshot(), widestStep = 0;
  for (let i = 0; i < REVEAL_DURATION * 60 + 2; i++) {
    const pose = controls.step(1 / 60);
    assert.ok(pose.span >= previous.span && pose.span <= views[0].span);
    widestStep = Math.max(widestStep, Math.abs(Math.log(pose.span / previous.span)));
    assert.ok(pose.target[0] >= previous.target[0]);
    assert.ok(pose.target[2] <= previous.target[2]);
    previous = pose;
  }
  assert.ok(widestStep < .01, 'scale must not jump between frames');
  assert.deepEqual(controls.snapshot(), { ...views[0], zoom: 1, view: 0, reveal: null });
  const final = controls.snapshot();
  for (let i = 0; i < 60; i++) assert.deepEqual(controls.step(1 / 60), final);
});

test('pause holds reveal time and pose; restart returns to the same opening', () => {
  const controls = createOrbitCamera(views);
  controls.startReveal(); const opening = controls.snapshot();
  for (let i = 0; i < 240; i++) controls.step(1 / 60);
  const beforePause = controls.snapshot();
  assert.ok(beforePause.span > opening.span);
  for (let i = 0; i < 120; i++) assert.deepEqual(controls.step(1 / 60, true), beforePause);
  assert.ok(controls.step(1 / 60).span > beforePause.span);
  controls.startReveal(); assert.deepEqual(controls.snapshot(), opening);
});

test('manual camera input cancels a reveal at its displayed pose without restarting it', () => {
  for (const action of ['beginOrbit', 'orbit', 'zoom', 'setView']) {
    const controls = createOrbitCamera(views); controls.startReveal();
    for (let i = 0; i < 240; i++) controls.step(1 / 60);
    const before = controls.snapshot();
    if (action === 'orbit') controls.orbit(0, 0, 800);
    else if (action === 'zoom') controls.zoom(0);
    else if (action === 'setView') controls.setView(1);
    else controls.beginOrbit();
    assert.equal(controls.snapshot().reveal, null);
    assert.equal(controls.snapshot().span, before.span);
    assert.deepEqual(controls.snapshot().target, before.target);
    if (action !== 'setView') {
      const stopped = controls.snapshot();
      for (let i = 0; i < 60; i++) assert.deepEqual(controls.step(1 / 60), stopped);
    }
  }
});

class Canvas extends EventTarget {
  captured = new Set();
  classList = { add() {}, remove() {} };
  focus() {}
  getBoundingClientRect() { return { height: 800, width: 1200 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  send(type, props = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button: 0, buttons: 1, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }, props);
    this.dispatchEvent(event);
  }
}

test('only the captured primary pointer can drag; release or cancellation stops it', () => {
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture', 'buttons']) {
    const canvas = new Canvas(), moves = [];
    const dispose = bindOrbitInput(canvas, { beginOrbit() {}, orbit: (...args) => moves.push(args), zoom() {} });
    canvas.send('pointerdown');
    canvas.send('pointerdown', { pointerId: 2, isPrimary: false });
    canvas.send('pointermove', { pointerId: 2, clientX: 900 });
    canvas.send('pointerup', { pointerId: 2 });
    canvas.send('pointermove', { clientX: 150, clientY: 120 });
    assert.deepEqual(moves, [[50, 20, 800]]);
    canvas.send(end === 'buttons' ? 'pointermove' : end, { buttons: 0 });
    canvas.send('pointermove', { clientX: 200 });
    assert.equal(moves.length, 1); assert.equal(canvas.captured.size, 0);
    dispose(); canvas.send('pointerdown');
    assert.equal(canvas.captured.size, 0);
  }
});

test('wheel input normalizes pixel, line, and page units', () => {
  const canvas = new Canvas(), deltas = [];
  const dispose = bindOrbitInput(canvas, { zoom: delta => deltas.push(delta) });
  canvas.send('wheel', { deltaMode: 0, deltaY: 80 });
  canvas.send('wheel', { deltaMode: 1, deltaY: 5 });
  canvas.send('wheel', { deltaMode: 2, deltaY: .1 });
  assert.deepEqual(deltas, [80, 80, 80]);
  dispose();
});

test('Shift-drag and Pan mode use translation, keep the gesture mode, and release cleanly', () => {
  for (const shiftKey of [true, false]) {
    const canvas = new Canvas(), pans = [], orbits = [];
    let mode = shiftKey ? 'orbit' : 'pan';
    const dispose = bindOrbitInput(canvas, { beginOrbit() {}, pan: (...args) => pans.push(args), orbit: (...args) => orbits.push(args) }, { getDragMode: () => mode });
    canvas.send('pointerdown', { shiftKey }); mode = 'orbit';
    canvas.send('pointermove', { clientX: 150, clientY: 130, shiftKey: false });
    assert.deepEqual(pans, [[50, 30, 800, 1200]]);
    assert.deepEqual(orbits, []);
    canvas.send('pointerup'); canvas.send('pointermove', { clientX: 200 });
    assert.equal(pans.length, 1);
    canvas.send('pointerdown'); canvas.send('pointermove', { clientX: 140, clientY: 120 });
    assert.deepEqual(orbits, [[40, 20, 800]]);
    dispose(); assert.equal(canvas.captured.size, 0);
  }
});

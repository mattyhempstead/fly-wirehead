import { clamp } from './matrix-timeline.js';

const copy = pose => ({ ...pose, target: [...pose.target] });
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const REVEAL_DURATION = 30;
const REVEAL_HOLD = 1.4;
const REVEAL_RAMP = .06;

// Integrate a smooth speed ramp at each end. Between those brief ramps,
// logarithmic zoom speed stays constant across the entire room/block reveal.
function revealProgress(t) {
  const ramp = REVEAL_RAMP;
  if (t > 1 - ramp) return 1 - revealProgress(1 - t);
  if (t >= ramp) return (t - ramp / 2) / (1 - ramp);
  const x = t / ramp;
  return ramp * (x ** 3 - .5 * x ** 4) / (1 - ramp);
}

export function createOrbitCamera(views) {
  const pose = { ...copy(views[0]), zoom: 1 };
  let destination = copy(pose), view = 0, reveal = null;
  function beginOrbit() {
    // Take over exactly where the camera is, even halfway through a preset move.
    reveal = null;
    destination = copy(pose);
  }
  return {
    snapshot: () => ({ ...copy(pose), view, reveal: reveal ? { elapsed: reveal.elapsed, duration: REVEAL_DURATION } : null }),
    startReveal(start = views[Math.min(2, views.length - 1)]) {
      const endView = views.length > 3 ? 3 : 0;
      reveal = { elapsed: 0, endView, from: { ...copy(start), zoom: 1 }, to: { ...copy(views[endView]), zoom: 1 } };
      Object.assign(pose, copy(reveal.from));
      destination = copy(pose); view = -1;
    },
    step(dt, paused = false) {
      if (reveal) {
        if (!paused) reveal.elapsed = Math.min(REVEAL_DURATION, reveal.elapsed + clamp(dt, 0, .05));
        const t = clamp((reveal.elapsed - REVEAL_HOLD) / (REVEAL_DURATION - REVEAL_HOLD), 0, 1);
        const eased = revealProgress(t);
        const { from, to } = reveal;
        // A logarithmic pullback changes scale evenly. Recenter with the visible
        // span so the opening fly stays in frame as its neighbours are revealed.
        pose.span = from.span * Math.pow(to.span / from.span, eased);
        const pan = to.span === from.span ? eased : (pose.span - from.span) / (to.span - from.span);
        pose.target = from.target.map((value, i) => value + (to.target[i] - value) * pan);
        pose.theta = wrap(from.theta + wrap(to.theta - from.theta) * eased);
        pose.phi = from.phi + (to.phi - from.phi) * eased;
        if (reveal.elapsed === REVEAL_DURATION) {
          Object.assign(pose, copy(to)); destination = copy(pose); view = reveal.endView; reveal = null;
        }
        return this.snapshot();
      }
      const amount = 1 - Math.exp(-clamp(dt, 0, .05) * 8);
      pose.theta = wrap(pose.theta + wrap(destination.theta - pose.theta) * amount);
      pose.span *= Math.pow(destination.span / pose.span, amount);
      for (const key of ['phi', 'zoom']) pose[key] += (destination[key] - pose[key]) * amount;
      pose.target = pose.target.map((value, i) => value + (destination.target[i] - value) * amount);
      return this.snapshot();
    },
    setView(index) {
      reveal = null;
      view = clamp(index, 0, views.length - 1);
      destination = { ...copy(views[view]), zoom: 1 };
      return view;
    },
    beginOrbit,
    orbit(dx, dy, viewportHeight) {
      beginOrbit();
      const sensitivity = 2.4 / Math.max(1, viewportHeight) * clamp(Math.sqrt(pose.span / pose.zoom / 42), .25, 1.4);
      // Grab the scene: both axes follow the pointer, with no delayed drag inertia.
      pose.theta = wrap(pose.theta - dx * sensitivity);
      pose.phi = clamp(pose.phi - dy * sensitivity, .35, 1.45);
      destination = copy(pose);
    },
    zoom(delta) {
      beginOrbit();
      pose.zoom = clamp(pose.zoom * Math.exp(-delta * .001), .65, 4);
      destination = copy(pose);
    }
  };
}

export function bindOrbitInput(canvas, controls) {
  let pointer = null;
  function release(event) {
    if (!pointer || (event && event.pointerId !== pointer.id)) return;
    const id = pointer.id;
    pointer = null;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function down(event) {
    if (event.button !== 0 || pointer || event.isPrimary === false) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    controls.beginOrbit();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(pointer.id);
    canvas.classList.add('dragging');
  }
  function move(event) {
    if (pointer?.id !== event.pointerId) return;
    if (!(event.buttons & 1)) { release(event); return; }
    controls.orbit(event.clientX - pointer.x, event.clientY - pointer.y, canvas.getBoundingClientRect().height);
    pointer.x = event.clientX; pointer.y = event.clientY;
  }
  function wheel(event) {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.getBoundingClientRect().height : 1;
    controls.zoom(event.deltaY * unit);
  }
  const handlers = { pointerdown: down, pointermove: move, pointerup: release, pointercancel: release, lostpointercapture: release, wheel };
  for (const [name, handler] of Object.entries(handlers)) canvas.addEventListener(name, handler, { passive: false });
  return () => {
    release();
    for (const [name, handler] of Object.entries(handlers)) canvas.removeEventListener(name, handler);
  };
}

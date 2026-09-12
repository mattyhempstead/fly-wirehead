import { smoother, lerp } from './recovery-timeline.js';

const mix = (a, b, p) => a.map((value, i) => lerp(value, b[i], p));
const add = (a, b) => a.map((value, i) => value + b[i]);
const view = (position, target, shot) => ({ position, target, shot });
const blend = (a, b, p) => view(mix(a.position, b.position, p), mix(a.target, b.target, p), p === 0 ? a.shot : b.shot);

// Long, continuous observation moves; scenery changes are handled by a short dissolve.
// These cameras never participate in the fly's retinal capture.
export function recoveryCamera(frame, position) {
  const t = frame.id === 'stairs' ? frame.motionTime : frame.local;
  if (frame.id === 'unplugged') {
    const p = smoother(t / frame.duration);
    return view([lerp(1.82, 2.4, p), lerp(1.73, 1.95, p), lerp(.1, .38, p)], [.30, 1.4, 0], 'face');
  }
  if (frame.id === 'walking') {
    const p = smoother(t / frame.duration);
    return view(add(position, [lerp(2.7, 1.45, p), lerp(1.5, 1.65, p), lerp(3.2, 3.65, p)]), add(position, [.06, .12, 0]), 'rails-tracking');
  }
  if (frame.id === 'treadmill') {
    const p = smoother(t / frame.duration);
    return view([lerp(2.7, .8, p), lerp(3.1, 2.65, p), lerp(4.3, 4.55, p)], [.06, 1.05, 0], 'treadmill-tracking');
  }
  if (frame.id === 'stairs') {
    const wide = view([-7.3, 5.7, 12.4], [3.4, 2.7, 0], 'staircase');
    const side = view(add(position, [-.6, 1.95, 5.15]), add(position, [.12, .1, 0]), 'climb-tracking');
    const summit = view(add(position, [3.4, 2, 3.9]), add(position, [.03, .15, 0]), 'summit-approach');
    if (t < 6.5) return blend(wide, side, smoother((t - 2.8) / 3.7));
    return blend(side, summit, smoother((t - 12) / 6));
  }
  const p = smoother(t / frame.duration), angle = lerp(Math.atan2(3.9, 3.4), .05, p);
  const distance = lerp(Math.hypot(3.4, 3.9), 5.8, p);
  return view(add(position, [Math.cos(angle) * distance, lerp(2, 3.8, p), Math.sin(angle) * distance]), add(position, [.03, .15, 0]), 'victory');
}

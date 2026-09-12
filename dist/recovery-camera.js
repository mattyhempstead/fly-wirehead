import { smoother, lerp } from './recovery-timeline.js';

const add = (a, b) => a.map((value, i) => value + b[i]);
const view = (position, target, shot) => ({ position, target, shot });

// Long, continuous observation moves; scenery changes are handled by a short dissolve.
// These cameras never participate in the fly's retinal capture.
export function recoveryCamera(frame, position) {
  const t = frame.local;
  if (frame.id === 'unplugged') {
    const p = smoother(t / frame.duration);
    return view([lerp(1.82, 2.4, p), lerp(1.62, 1.82, p), lerp(.1, .38, p)], [.30, 1.4, 0], 'face');
  }
  if (frame.id === 'walking') {
    const p = smoother(t / frame.duration);
    return view(add(position, [lerp(2.7, 1.45, p), lerp(1, 1.05, p), lerp(3.2, 3.65, p)]), add(position, [.06, .12, 0]), 'rails-tracking');
  }
  if (frame.id === 'treadmill') {
    const p = smoother(t / frame.duration);
    return view([lerp(2.7, .8, p), lerp(2.15, 2.05, p), lerp(4.3, 4.55, p)], [.06, 1.05, 0], 'treadmill-tracking');
  }
  if (frame.id === 'stairs') {
    const p = smoother(t / frame.duration);
    const angle = lerp(Math.atan2(6.4, -1.7), Math.atan2(3.9, 3.4), p);
    const distance = lerp(Math.hypot(-1.7, 6.4), Math.hypot(3.4, 3.9), p);
    return view(add(position, [Math.cos(angle) * distance, lerp(1.1, 1.15, p), Math.sin(angle) * distance]), add(position, [.03, .15, 0]), 'climb-pan');
  }
  const p = smoother(t / frame.duration), angle = lerp(Math.atan2(3.9, 3.4), .05, p);
  const distance = lerp(Math.hypot(3.4, 3.9), 5.8, p);
  return view(add(position, [Math.cos(angle) * distance, lerp(1.15, 1.55, p), Math.sin(angle) * distance]), add(position, [.03, .15, 0]), 'victory');
}

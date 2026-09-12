// Presentation choreography only. No neural values are generated here.
export const SCENES = [
  { id: 'unplugged', title: 'Unplugged', start: 0, duration: 6 },
  { id: 'walking', title: 'Learning to walk', start: 6, duration: 8 },
  { id: 'treadmill', title: 'Finding a rhythm', start: 14, duration: 5 },
  { id: 'stairs', title: 'The climb', start: 19, duration: 10 },
  { id: 'victory', title: 'Back on six feet', start: 29, duration: 4 },
];
export const DURATION = SCENES.at(-1).start + SCENES.at(-1).duration;
export const UNPLUG_AT = 2.6;
export const FLY_SCALE = .48;
export const STEPS = { count: 36, rise: .17, tread: .32, width: 6 };
export const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
export const smoother = value => { const p = clamp(value); return p ** 3 * (p * (p * 6 - 15) + 10); };
export const lerp = (a, b, p) => a + (b - a) * p;
// Integral of a smooth speed ramp: changing cadence must not jump the gait phase.
export function rampDistance(time, start, duration) {
  const p = Math.max(0, (time - start) / duration);
  return duration * (p < 1 ? p ** 3 - .5 * p ** 4 : p - .5);
}
export function walkingMotion(time) {
  return {
    distance: .13 * time - .13 * rampDistance(time, 1.4, .8) + .19 * rampDistance(time, 4.1, .9),
    phase: 4.2 * time - 2.8 * rampDistance(time, 1.6, .65) + 4.1 * rampDistance(time, 4.1, 1.1),
    cadence: 4.2 - 2.8 * ease((time - 1.6) / .65) + 4.1 * ease((time - 4.1) / 1.1),
  };
}
export function treadmillMotion(time) {
  return { phase: 5 * time + 10 * rampDistance(time, 0, 10), belt: .4 * time + .8 * rampDistance(time, 0, 10) };
}
// Each stance keeps a foot planted. Only the airborne part crosses a stair edge.
export function terrainFoot(travel, offset, origin, groundAt, stepLength = STEPS.tread * 2) {
  const cycle = travel / stepLength + offset, index = Math.floor(cycle), progress = cycle - index;
  const start = origin + (index - offset - .5) * stepLength, end = start + stepLength;
  const swing = clamp(progress / .42), blend = ease(swing);
  return [lerp(start, end, blend), lerp(groundAt(start), groundAt(end), blend) + Math.sin(Math.PI * swing) ** 2 * .23];
}
export function recoveryFrame(time) {
  const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const index = Math.max(0, SCENES.findLastIndex(scene => t >= scene.start));
  const scene = SCENES[index], local = t - scene.start;
  const stumble = scene.id === 'walking' ? ease((local - 1.9) / .55) * (1 - ease((local - 3.2) / 1.25)) : 0;
  // Edit out the middle of the journey, rather than speeding up the same climb.
  let motionTime = scene.id === 'treadmill' ? local + 5 : local, edit = scene.id;
  if (scene.id === 'stairs') {
    if (local < 2.4) { motionTime = local + .8; edit = 'stairs-base'; }
    else if (local < 6.3) { motionTime = local - 2.4 + 6.5; edit = 'stairs-middle'; }
    else { motionTime = local - 6.3 + 14.3; edit = 'stairs-summit'; }
  }
  return { ...scene, index, time: t, local, motionTime, edit, progress: local / scene.duration, attached: t < UNPLUG_AT, stumble, ended: t === DURATION };
}
export function stairHeight(x) {
  if (x < 0) return 0;
  return Math.min(STEPS.count, Math.floor(x / STEPS.tread) + 1) * STEPS.rise;
}
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const length = a => Math.hypot(...a);
export function solveLeg(rest, target) {
  const [a, b, c, d] = rest, upper = length(sub(b, a)), lower = length(sub(c, b));
  const offset = sub(target, a), raw = length(offset), direction = offset.map(n => n / Math.max(raw, 1e-9));
  if (raw < 1e-9) direction[1] = -1;
  const distance = clamp(raw, Math.abs(upper - lower) + .0001, upper + lower - .0001);
  const ankle = a.map((n, i) => n + direction[i] * distance);
  const pole = [0, 0, Math.sign(a[2]) || 1], alongPole = dot(pole, direction);
  let bend = pole.map((n, i) => n - direction[i] * alongPole);
  if (length(bend) < 1e-6) bend = [1, 0, 0];
  const bendLength = length(bend), along = (upper ** 2 - lower ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  const joint = a.map((n, i) => n + direction[i] * along + bend[i] / bendLength * height);
  const tip = ankle.map((n, i) => n + d[i] - c[i]);
  return [[...a], joint, ankle, tip];
}

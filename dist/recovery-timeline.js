// Presentation choreography only. No neural values are generated here.
export const SCENES = [
  { id: 'unplugged', title: 'Unplugged', start: 0, duration: 3 },
  { id: 'walking', title: 'Learning to walk', start: 3, duration: 5 },
  { id: 'treadmill', title: 'Finding a rhythm', start: 8, duration: 3 },
  { id: 'stairs', title: 'The climb', start: 11, duration: 5 },
  { id: 'victory', title: 'Back on its feet', start: 16, duration: 2 },
];
export const DURATION = SCENES.at(-1).start + SCENES.at(-1).duration;
export const PLAYBACK_RATE = 1.5;
export const RUN_SECONDS = DURATION / PLAYBACK_RATE;
export const UNPLUG_AT = .8;
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
    distance: .13 * time - .13 * rampDistance(time, .6, .5) + .19 * rampDistance(time, 2.6, .7),
    phase: 4.2 * time - 2.8 * rampDistance(time, .75, .45) + 4.1 * rampDistance(time, 2.6, .7),
    cadence: 4.2 - 2.8 * ease((time - .75) / .45) + 4.1 * ease((time - 2.6) / .7),
  };
}
export function treadmillMotion(time) {
  return { phase: 5 * time + 10 * rampDistance(time, 0, 10), belt: .4 * time + .8 * rampDistance(time, 0, 10) };
}
// An alternating two-foot gait, with a brief double-support interval each step.
export function bipedFoot(phase, side, stride = .08) {
  const cycle = ((phase / (Math.PI * 2) + (side === 1 ? .5 : 0)) % 1 + 1) % 1;
  const swing = clamp(cycle / .42);
  const x = cycle < .42 ? lerp(-stride, stride, ease(swing)) : lerp(stride, -stride, (cycle - .42) / .58);
  return [x - .06, Math.sin(Math.PI * swing) ** 2 * .09, side * .26];
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
  const stumble = scene.id === 'walking' ? ease((local - .9) / .4) * (1 - ease((local - 1.7) / 1.1)) : 0;
  // Show one uninterrupted final climb at the existing pace, with no travel jumps.
  const motionTime = scene.id === 'treadmill' ? local + 7 : scene.id === 'stairs' ? local + 13 : local;
  return { ...scene, index, time: t, local, motionTime, progress: local / scene.duration, attached: t < UNPLUG_AT, stumble, ended: t === DURATION };
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

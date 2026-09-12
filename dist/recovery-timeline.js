// Presentation choreography only. No neural values are generated here.
export const SCENES = [
  { id: 'unplugged', title: 'Unplugged', start: 0, duration: 10 },
  { id: 'walking', title: 'Learning to walk', start: 10, duration: 14 },
  { id: 'treadmill', title: 'Finding a rhythm', start: 24, duration: 12 },
  { id: 'stairs', title: 'The climb', start: 36, duration: 18 },
  { id: 'victory', title: 'Back on six feet', start: 54, duration: 10 },
];
export const DURATION = 64;
export const UNPLUG_AT = 2.6;
export const FLY_SCALE = .48;
export const STEPS = { count: 36, rise: .17, tread: .32, width: 6 };
export const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
export const lerp = (a, b, p) => a + (b - a) * p;
export function recoveryFrame(time) {
  const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const index = Math.max(0, SCENES.findLastIndex(scene => t >= scene.start));
  const scene = SCENES[index], local = t - scene.start;
  const stumble = scene.id === 'walking' ? ease((local - 4) / .55) * (1 - ease((local - 5.4) / 1.4)) : 0;
  return { ...scene, index, time: t, local, progress: local / scene.duration, attached: t < UNPLUG_AT, stumble, ended: t === DURATION };
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

// Independent presentation clocks. These do not generate neural measurements.
import { SWIPE_SECONDS, sampleSwipe } from './swipe.js';

export const ROWS = 8, COLUMNS = 8, STATION_COUNT = ROWS * COLUMNS;
export const PITCH_X = 5.6, PITCH_Z = 3.75;
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mod = (n, size) => ((n % size) + size) % size;
export function random(seed) {
  let x = (seed + 1) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export const stations = Array.from({ length: STATION_COUNT }, (_, id) => ({
  id, row: Math.floor(id / COLUMNS), column: id % COLUMNS,
  x: (id % COLUMNS - (COLUMNS - 1) / 2) * PITCH_X,
  z: (Math.floor(id / COLUMNS) - (ROWS - 1) / 2) * PITCH_Z,
  period: 2.6 + random(id + 503) * .9,
  offset: random(id + 877) * 7,
  phase: random(id + 1001) * Math.PI * 2,
}));

export function stationFrame(station, time, clips, reducedMotion = false) {
  if (!clips.length) return null;
  const clock = Math.max(0, time) + station.offset;
  const cycle = Math.floor(clock / station.period), local = clock - cycle * station.period;
  const direction = station.id % 2 ? -1 : 1;
  const clipIndex = turn => mod(Math.floor(random(station.id + 127) * clips.length) + turn * direction, clips.length);
  const current = clipIndex(cycle), previous = clipIndex(cycle - 1);
  const playhead = (index, turn, elapsed) => {
    const room = Math.max(0, clips[index].duration - station.period - .1);
    return Math.min(clips[index].duration - .001, random(station.id * 997 + turn * 71 + 9001) * room + elapsed);
  };
  const gesture = reducedMotion ? 1 : Math.min(1, local / SWIPE_SECONDS);
  return { id: station.id, cycle, current, previous, gesture, slide: sampleSwipe(gesture).screen,
    currentTime: playhead(current, cycle, local), previousTime: playhead(previous, cycle - 1, station.period) };
}

// The native input uses bottom-to-top RGBA, matching WebGL readPixels.
export function bottomUpRGBA(bytes, width, height) {
  const stride = width * 4, output = new Uint8Array(bytes.length);
  for (let y = 0; y < height; y++) output.set(bytes.subarray(y * stride, (y + 1) * stride), (height - 1 - y) * stride);
  return output;
}

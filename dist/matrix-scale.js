import { STATION_COUNT, clamp } from './matrix-timeline.js';

export const BLOCK_ROWS = 100, BLOCK_COLUMNS = 100;
export const BLOCK_COUNT = BLOCK_ROWS * BLOCK_COLUMNS;
export const BLOCK_SIZE = 64, BLOCK_PITCH = 70;
export const CAMPUS_CENTER = [-BLOCK_PITCH / 2, 0, -BLOCK_PITCH / 2];
export const CAMPUS_SPAN = 9300;
export const REPRESENTED_FLIES = STATION_COUNT * BLOCK_COUNT;
export const DETAIL_SPAN = 180;

// Concentric ordering lets a single instanced draw expand to nearby blocks only.
export const blocks = Array.from({ length: BLOCK_COUNT }, (_, id) => {
  const column = id % BLOCK_COLUMNS - BLOCK_COLUMNS / 2;
  const row = Math.floor(id / BLOCK_COLUMNS) - BLOCK_ROWS / 2;
  return { id, column, row, x: column * BLOCK_PITCH, z: row * BLOCK_PITCH, ring: Math.max(Math.abs(column), Math.abs(row)) };
}).sort((a, b) => a.ring - b.ring || a.id - b.id);

const ringCounts = Array.from({ length: 51 }, (_, ring) => blocks.filter(block => block.ring <= ring).length);
export function visibleBlockCount(span, aspect, phi, target = [0, 0, 0]) {
  const reach = span * .5 * Math.hypot(aspect, 1 / Math.max(.2, Math.cos(phi)));
  const offset = Math.max(Math.abs(target[0]), Math.abs(target[2]));
  const ring = clamp(Math.ceil((reach + offset) / BLOCK_PITCH) + 1, 1, 50);
  return ringCounts[ring];
}

import { STATION_COUNT, clamp } from './matrix-timeline.js';

export const ROOMS_PER_AXIS = 10, ROOMS_PER_BLOCK = ROOMS_PER_AXIS ** 2;
export const BLOCKS_PER_AXIS = 10, BLOCK_COUNT = BLOCKS_PER_AXIS ** 2;
export const ROOM_COUNT = ROOMS_PER_BLOCK * BLOCK_COUNT;
export const ROOM_SIZE = 64, ROOM_PITCH = 70, ROOM_WALL_HEIGHT = 6;
export const BLOCK_SIZE = 734, BLOCK_PITCH = 750;
export const BLOCK_CENTER = [-ROOM_PITCH / 2, 0, -ROOM_PITCH / 2];
export const CAMPUS_CENTER = [-BLOCK_PITCH / 2 + BLOCK_CENTER[0], 0, -BLOCK_PITCH / 2 + BLOCK_CENTER[2]];
export const CAMPUS_SIZE = (BLOCKS_PER_AXIS - 1) * BLOCK_PITCH + BLOCK_SIZE;
export const BLOCK_SPAN = 800, CAMPUS_SPAN = 8000;
export const REPRESENTED_FLIES = STATION_COUNT * ROOM_COUNT;
// Keep the original room intact through both grid reveals. Its proxy is only
// used near the end, when the whole room occupies roughly a dozen screen pixels.
export const DETAIL_SPAN = 4000;

// The original room and its 100-room block both sit in the middle of their grid.
export const blocks = Array.from({ length: BLOCK_COUNT }, (_, id) => {
  const column = id % BLOCKS_PER_AXIS - BLOCKS_PER_AXIS / 2;
  const row = Math.floor(id / BLOCKS_PER_AXIS) - BLOCKS_PER_AXIS / 2;
  return { id, column, row, x: column * BLOCK_PITCH + BLOCK_CENTER[0], z: row * BLOCK_PITCH + BLOCK_CENTER[2], ring: Math.max(Math.abs(column), Math.abs(row)) * BLOCK_PITCH };
}).sort((a, b) => a.ring - b.ring || a.id - b.id);

// Physical-distance ordering keeps the first 100 rooms in the original block
// and lets each instanced draw grow without generating additional geometry.
export const rooms = blocks.flatMap(block => Array.from({ length: ROOMS_PER_BLOCK }, (_, id) => {
  const column = id % ROOMS_PER_AXIS - ROOMS_PER_AXIS / 2;
  const row = Math.floor(id / ROOMS_PER_AXIS) - ROOMS_PER_AXIS / 2;
  const x = block.column * BLOCK_PITCH + column * ROOM_PITCH;
  const z = block.row * BLOCK_PITCH + row * ROOM_PITCH;
  return { id: block.id * ROOMS_PER_BLOCK + id, blockId: block.id, column, row, x, z, ring: Math.max(Math.abs(x), Math.abs(z)) };
})).sort((a, b) => a.ring - b.ring || a.id - b.id);

function visibleCount(items, margin, span, aspect, phi, target) {
  const reach = span * .5 * Math.hypot(aspect, 1 / Math.max(.05, Math.cos(phi)));
  // Include where the viewing ray hits the floor after vertical screen panning.
  const offset = Math.max(Math.abs(target[0]), Math.abs(target[2])) + Math.abs(target[1]) * Math.tan(phi);
  // Submit a padded neighbourhood before its edges can enter the frame, also
  // accounting for raised walls at low camera angles. Culling is never a reveal.
  const limit = reach * 1.15 + offset + margin + ROOM_PITCH + ROOM_WALL_HEIGHT * Math.tan(phi);
  let low = 0, high = items.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (items[mid].ring <= limit) low = mid + 1;
    else high = mid;
  }
  return low;
}
export function visibleRoomCount(span, aspect, phi, target = [0, 0, 0]) {
  return visibleCount(rooms, ROOM_SIZE, span, aspect, phi, target);
}
export function visibleBlockCount(span, aspect, phi, target = [0, 0, 0]) {
  return visibleCount(blocks, BLOCK_SIZE + ROOM_PITCH / 2, span, aspect, phi, target);
}
function smoothstep(value, start, end) {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}
export function revealOpacity(span, orbit) {
  // Panning into another room must not hide it when the user zooms back in.
  // Project the camera target onto the floor so vertical pans count correctly.
  const groundOffset = orbit ? Math.hypot(
    orbit.target[0] - orbit.target[1] * Math.tan(orbit.phi) * Math.sin(orbit.theta),
    orbit.target[2] - orbit.target[1] * Math.tan(orbit.phi) * Math.cos(orbit.theta),
  ) : 0;
  return {
    rooms: smoothstep(Math.max(span, groundOffset * 2), 28, 110),
    // The outer grid is already opaque offscreen; only the camera reveals it.
    blocks: 1,
  };
}

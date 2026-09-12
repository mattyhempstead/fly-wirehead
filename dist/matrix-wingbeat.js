import { random, STATION_COUNT } from './matrix-timeline.js';

// Stable presentation rhythms, independent even at the same station in two rooms.
export function wingbeatProfile(roomId, stationId) {
  const seed = roomId * STATION_COUNT + stationId;
  return [random(seed * 3 + 11003) * Math.PI * 2, 18 + random(seed * 3 + 11004) * 6, .85 + random(seed * 3 + 11005) * .3];
}

export function wingbeatAngle(profile, time, motor) {
  return Math.sin(time * profile[1] + profile[0]) * (.12 + motor * .25) * profile[2];
}

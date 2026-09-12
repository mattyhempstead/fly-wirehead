import test from 'node:test';
import assert from 'node:assert/strict';
import { stations, STATION_COUNT, stationFrame, bottomUpRGBA } from '../dist/matrix-timeline.js';
import { sampleSwipe, SWIPE_SECONDS } from '../dist/swipe.js';
import { createPlayback } from '../dist/simulation.js';

const clips = [5.2, 6.9, 4.6, 14.2, 4].map(duration => ({ duration }));

test('all 64 stations have distinct clocks and occupy a complete 8 by 8 grid', () => {
  assert.equal(STATION_COUNT, 64);
  assert.equal(new Set(stations.map(s => `${s.x},${s.z}`)).size, 64);
  assert.equal(new Set(stations.map(s => s.row)).size, 8);
  assert.equal(new Set(stations.map(s => s.column)).size, 8);
  assert.equal(new Set(stations.map(s => s.period)).size, 64);
  for (let time = 0; time < 90; time += .25) {
    const frames = stations.map(s => stationFrame(s, time, clips));
    assert.equal(new Set(frames.map(f => f.current)).size, 5);
    const swiping = frames.filter(f => f.gesture < 1);
    assert.ok(swiping.length >= 5 && swiping.length < 40);
    assert.ok(new Set(swiping.map(f => f.gesture)).size > 5);
  }
});

test('every independent feed changes clips with continuous playback within each turn and honors the four-second trim', () => {
  for (const station of stations) {
    let previous;
    for (let time = 0; time < 30; time += .02) {
      const frame = stationFrame(station, time, clips);
      assert.notEqual(frame.current, frame.previous);
      assert.ok(frame.currentTime >= 0 && frame.currentTime < clips[frame.current].duration);
      assert.ok(frame.previousTime >= 0 && frame.previousTime < clips[frame.previous].duration);
      if (previous?.cycle === frame.cycle) assert.ok(Math.abs(frame.currentTime - previous.currentTime - .02) < 1e-10);
      else if (previous) assert.equal(frame.previous, previous.current);
      previous = frame;
    }
  }
});

test('the phone slide and front-right leg share the same swipe timeline', () => {
  const station = { ...stations[0], offset: 0 };
  for (let t = 0; t <= SWIPE_SECONDS; t += .01) {
    const frame = stationFrame(station, t, clips);
    assert.equal(frame.gesture, Math.min(1, t / SWIPE_SECONDS));
    assert.equal(frame.slide, sampleSwipe(frame.gesture).screen);
  }
  assert.equal(stationFrame(station, .3, clips, true).gesture, 1);
  assert.equal(stationFrame(station, .3, clips, true).slide, 1);
});

test('pausing the floor holds all feed playheads without altering measured activity', () => {
  const player = createPlayback(); player.setPaused(false); player.state.pam11Hz = 90;
  for (let i = 0; i < 120; i++) player.tick(1 / 60);
  const before = stations.map(s => stationFrame(s, player.state.time, clips));
  player.setPaused(true);
  for (let i = 0; i < 120; i++) player.tick(1 / 60);
  assert.deepEqual(stations.map(s => stationFrame(s, player.state.time, clips)), before);
  assert.equal(player.state.pam11Hz, 90);
});

test('shared-brain pixel transport preserves pixels in the native bottom-up RGBA order', () => {
  const top = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 40, 50, 60, 255]);
  const snapshot = top.slice(), flipped = bottomUpRGBA(top, 2, 2);
  assert.deepEqual([...flipped], [0, 0, 255, 255, 40, 50, 60, 255, 255, 0, 0, 255, 0, 255, 0, 255]);
  assert.deepEqual(bottomUpRGBA(flipped, 2, 2), top);
  assert.deepEqual(top, snapshot);
});

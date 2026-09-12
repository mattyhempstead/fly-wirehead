import test from 'node:test';
import assert from 'node:assert/strict';
import { stations, STATION_COUNT, stationClipOrder, stationFrame, bottomUpRGBA } from '../dist/matrix-timeline.js';
import { sampleSwipe, SWIPE_SECONDS } from '../dist/swipe.js';
import { createPlayback } from '../dist/simulation.js';

const clips = [5.2, 6.9, 4.6, 14.2, 4, 8, 5.1, 24.7, 4.6, 27, 6.4, 16.8].map(duration => ({ duration }));

test('all 64 stations have distinct clocks and occupy a complete 8 by 8 grid', () => {
  assert.equal(STATION_COUNT, 64);
  assert.equal(new Set(stations.map(s => `${s.x},${s.z}`)).size, 64);
  assert.equal(new Set(stations.map(s => s.row)).size, 8);
  assert.equal(new Set(stations.map(s => s.column)).size, 8);
  assert.equal(new Set(stations.map(s => s.period)).size, 64);
  for (let time = 0; time < 90; time += .25) {
    const frames = stations.map(s => stationFrame(s, time, clips));
    assert.ok(new Set(frames.map(f => f.current)).size >= 9);
    const swiping = frames.filter(f => f.gesture < 1);
    assert.ok(swiping.length >= 5 && swiping.length < 40);
    assert.ok(new Set(swiping.map(f => f.gesture)).size > 5);
  }
});

test('all 64 flies have distinct shuffled loops, even when compared at different starting positions', () => {
  const loops = stations.map(station => {
    const order = stationClipOrder(station.id, clips.length);
    assert.deepEqual([...order].sort((a, b) => a - b), clips.map((_, i) => i));
    const first = order.indexOf(0);
    return [...order.slice(first), ...order.slice(0, first)].join(',');
  });
  assert.equal(new Set(loops).size, STATION_COUNT);
});

test('each phone plays every clip once per loop and repeats its own order across the wrap', () => {
  for (const station of stations) {
    const order = stationClipOrder(station.id, clips.length);
    for (let turn = 3; turn < 3 + clips.length * 3; turn++) {
      const frame = stationFrame(station, turn * station.period - station.offset + .1, clips);
      assert.equal(frame.current, order[turn % clips.length]);
      assert.equal(frame.previous, order[(turn - 1) % clips.length]);
      assert.notEqual(frame.current, frame.previous);
    }
    assert.deepEqual(stationClipOrder(station.id, clips.length), order);
  }
});

test('small collections still produce complete loops when 64 distinct cycles are impossible', () => {
  for (const count of [1, 2, 3, 5]) {
    for (const station of stations) {
      const order = stationClipOrder(station.id, count);
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i));
    }
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

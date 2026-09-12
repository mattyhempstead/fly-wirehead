import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryFrame, DURATION, SCENES, UNPLUG_AT, solveLeg, stairHeight, STEPS } from '../dist/recovery-timeline.js';
import { BrainClient } from '../dist/backend.js';

test('the five scenes cut in order, unplug once, and hold the final victory', () => {
  assert.deepEqual(SCENES.map(s => s.id), ['unplugged', 'walking', 'treadmill', 'stairs', 'victory']);
  for (const scene of SCENES) assert.equal(recoveryFrame(scene.start).id, scene.id);
  assert.equal(recoveryFrame(UNPLUG_AT - .001).attached, true);
  assert.equal(recoveryFrame(UNPLUG_AT).attached, false);
  for (let t = UNPLUG_AT; t <= DURATION + 10; t += .1) assert.equal(recoveryFrame(t).attached, false);
  assert.equal(recoveryFrame(1000).time, DURATION);
  assert.equal(recoveryFrame(1000).ended, true);
  assert.equal(recoveryFrame(NaN).time, 0);
});
test('the stumble develops, holds, and resolves within the walking scene', () => {
  const start = SCENES[1].start;
  assert.equal(recoveryFrame(start + 3).stumble, 0);
  assert.ok(recoveryFrame(start + 5).stumble > .95);
  assert.ok(recoveryFrame(start + 6).stumble > 0);
  assert.equal(recoveryFrame(start + 8).stumble, 0);
  assert.equal(recoveryFrame(45).stumble, 0);
});
test('leg poses retain all segment lengths even at unreachable rail and victory targets', () => {
  const rest = [[.33, -.17, .3], [.85, -.37, .75], [.92, -.94, .99], [1.16, -.96, 1.07]];
  const length = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
  for (const target of [[1.02, .56, 1.08], [.62, .97, .49], [3, 5, 0], rest[0], [0, -.9, 1], [.33, -.17, 8]]) {
    const pose = solveLeg(rest, target);
    assert.ok(pose.flat().every(Number.isFinite)); assert.deepEqual(pose[0], rest[0]);
    for (let i = 1; i < 4; i++) assert.ok(Math.abs(length(pose[i - 1], pose[i]) - length(rest[i - 1], rest[i])) < 1e-6);
  }
});
test('the outdoor staircase has human step dimensions and an actual upper landing', () => {
  assert.equal(stairHeight(-.1), 0);
  assert.equal(stairHeight(.01), .17);
  assert.equal(stairHeight(.33), .34);
  assert.equal(stairHeight(STEPS.count * STEPS.tread + 5), STEPS.count * STEPS.rise);
  assert.ok(STEPS.count >= 30 && STEPS.width >= 3);
});
test('eye-view bytes and attachment metadata travel together without modifying neural readings', async () => {
  const bytes = new Uint8Array(90 * 160 * 4).fill(83), calls = [], measured = { phase: 'ready', paused: false, busy: false };
  const client = new BrainClient({ captureFrame: () => ({ bytes, recovery: { scene: 'walking', attached: false } }), onStatus: s => assert.equal(s, measured), onError: e => { throw e; }, fetcher: async (path, options) => {
    calls.push([path, options]); const data = path === '/api/session' ? { token: 'test' } : path === '/api/status' ? measured : { accepted: true };
    return { ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => data };
  } });
  client.stopped = false; await client.poll(); client.stop();
  const sent = calls.find(([path]) => path === '/api/frame')[1];
  assert.equal(sent.body, bytes); assert.equal(sent.headers['X-Fly-Scene'], 'walking');
  assert.equal(sent.headers['X-Fly-Attached'], 'false'); assert.equal(sent.headers['X-Fly-Experience'], 'recovery');
});

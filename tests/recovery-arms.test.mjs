import test from 'node:test';
import assert from 'node:assert/strict';
import { runningArmPose, tuckedArmPose } from '../dist/recovery-arms.js';

const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const subtract = (a, b) => a.map((n, i) => n - b[i]);
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, n, i) => sum + n * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b)))));
function worldRest(side, middle = false) {
  const x = middle ? -.13 : .33;
  const rest = [[x, -.17, side * .3], [x + (middle ? .04 : .52), -.37, side * .75], [x + (middle ? .24 : .59), -.94, side * .99], [x + (middle ? .48 : .83), -.96, side * 1.07]];
  return rest.map(([x, y, z]) => [(.54 * x - .8416650165 * y) * .48, (.8416650165 * x + .54 * y) * .48 + 1.06, z * .48]);
}
function checkLengths(rest, pose) {
  assert.deepEqual(pose[0], rest[0]);
  assert.ok(pose.flat().every(Number.isFinite));
  for (let i = 1; i < 4; i++) assert.ok(Math.abs(distance(pose[i], pose[i - 1]) - distance(rest[i], rest[i - 1])) < 1e-10);
}

test('running arms keep bent elbows close to the body and wrists aligned throughout the stride', () => {
  for (const side of [-1, 1]) {
    const rest = worldRest(side);
    let previous;
    for (let phase = 0; phase < Math.PI * 4; phase += .01) {
      const pose = runningArmPose(rest, phase, side);
      checkLengths(rest, pose);
      assert.ok(pose[1][1] < pose[0][1]);
      assert.ok(Math.abs(pose[1][2] - pose[0][2]) < .13);
      const bend = angle(subtract(pose[0], pose[1]), subtract(pose[2], pose[1]));
      assert.ok(bend > Math.PI * .3 && bend < Math.PI * .6);
      assert.ok(angle(subtract(pose[2], pose[1]), subtract(pose[3], pose[2])) < .2);
      if (previous) for (let i = 0; i < 4; i++) assert.ok(distance(pose[i], previous[i]) < .006);
      previous = pose;
    }
    const start = runningArmPose(rest, 0, side), end = runningArmPose(rest, Math.PI * 2, side);
    for (let i = 0; i < 4; i++) assert.ok(distance(start[i], end[i]) < 1e-10);
  }
});

test('the two running arms swing in opposition and settle continuously into victory', () => {
  const relativeHandX = (side, phase) => { const rest = worldRest(side); return runningArmPose(rest, phase, side)[2][0] - rest[0][0]; };
  assert.ok(relativeHandX(-1, 0) > relativeHandX(1, 0));
  assert.ok(relativeHandX(-1, Math.PI) < relativeHandX(1, Math.PI));
  for (const side of [-1, 1]) {
    const rest = worldRest(side);
    let previous;
    for (let lift = 0; lift <= 1; lift += .001) {
      const pose = runningArmPose(rest, 0, side, 0, lift);
      checkLengths(rest, pose);
      if (previous) for (let i = 1; i < 4; i++) assert.ok(distance(pose[i], previous[i]) < .004);
      previous = pose;
    }
    assert.ok(runningArmPose(rest, 0, side, 0, 1)[2][1] > rest[0][1] + .5);
    const foldedRest = worldRest(side, true), folded = tuckedArmPose(foldedRest, side);
    checkLengths(foldedRest, folded);
    assert.ok(Math.abs(folded[1][2] - folded[0][2]) < .11);
    assert.ok(folded[1][1] < folded[0][1] && folded[2][1] > folded[1][1]);
  }
});

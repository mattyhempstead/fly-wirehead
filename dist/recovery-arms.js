import { clamp, lerp } from './recovery-timeline.js';

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

function armChain(rest, directions) {
  const pose = [[...rest[0]]];
  directions.forEach((direction, i) => {
    const scale = distance(rest[i], rest[i + 1]) / Math.hypot(...direction);
    pose.push(pose[i].map((value, axis) => value + direction[axis] * scale));
  });
  return pose;
}

// World-space shoulder rotation keeps the elbows beside the torso instead of
// letting a short hand target fold the entire limb sideways through an IK pole.
export function runningArmPose(rest, phase, side, activity = 1, victory = 0) {
  const lift = clamp(victory);
  const stroke = Math.cos(phase + (side === 1 ? Math.PI : 0) + .5) * clamp(activity);
  const restingShoulder = -.15 + stroke * .46;
  const shoulder = lerp(restingShoulder, Math.PI - .45, lift);
  const elbow = 1.90 + stroke * .12;
  const forearm = lerp(restingShoulder + elbow, Math.PI - .1, lift);
  const wrist = forearm - .16 * (1 - lift);
  return armChain(rest, [
    [Math.sin(shoulder), -Math.cos(shoulder), side * lerp(.36, .65, lift)],
    [Math.sin(forearm), -Math.cos(forearm), side * lerp(.035, .25, lift)],
    [Math.sin(wrist), -Math.cos(wrist), side * lerp(.025, .15, lift)],
  ]);
}

export function tuckedArmPose(rest, side) {
  return armChain(rest, [
    [-.38, -.86, side * .43],
    [.20, .96, side * .08],
    [.10, .97, -side * .04],
  ]);
}

import * as THREE from 'three';
import { createRecoveryFly } from './fly-model.js';
import { createRecoveryWorld } from './recovery-world.js';
import { createMotionResponse } from './motion.js';
import { recoveryFrame, FLY_SCALE, STEPS, ease, lerp, clamp } from './recovery-timeline.js';
import { stairHeight } from './recovery-timeline.js';

export function createRecoveryLab(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xd9e4d8);
  scene.fog = new THREE.Fog(0xd9e4d8, 22, 80);
  const camera = new THREE.PerspectiveCamera(40, 1, .025, 120);
  const eyeCamera = new THREE.PerspectiveCamera(100, 90 / 160, .025, 100);
  const hemi = new THREE.HemisphereLight(0xf4fbec, 0x70816b, 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe3b5, 3.2); sun.position.set(1, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 36 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .015; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xc7e6e0, 1.3); fill.position.set(-4, 3, -2); scene.add(fill);
  const world = createRecoveryWorld(scene), specimen = createRecoveryFly(); scene.add(specimen.root);
  specimen.root.scale.setScalar(FLY_SCALE);
  const response = createMotionResponse(), target = new THREE.Vector3(), cameraAt = new THREE.Vector3();
  const sensorTarget = new THREE.WebGLRenderTarget(90, 160); sensorTarget.texture.colorSpace = THREE.SRGBColorSpace;
  const pixels = new Uint8Array(90 * 160 * 4);
  let frame = recoveryFrame(0), width = 0, height = 0, orbitX = 0, orbitY = 0, currentShot = '', lastFrame = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    width = rect.width; height = rect.height; renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    // Compose the specimen above and to the left of its persistent telemetry.
    camera.setViewOffset(width, height, width > 700 ? width * .14 : 0, height * .10, width, height);
    camera.updateProjectionMatrix();
  }
  function render(time, dt, state) {
    resize(); frame = recoveryFrame(time); world.setScene(frame.id);
    const neural = response.step(state, state.paused ? 0 : dt), local = frame.local;
    const fly = specimen.root, summitX = STEPS.count * STEPS.tread, summitY = STEPS.count * STEPS.rise;
    let gait = 0, stride = .2, rail = false, victory = 0, groundAt = null, shot;
    fly.rotation.set(0, 0, 0); fly.position.set(0, .837 + .96 * FLY_SCALE, 0);
    if (frame.id === 'unplugged') {
      fly.rotation.z = -.03 * ease((local - 2.6) / 2);
      if (local < 6) {
        // Hold the unmistakable compound eyes front-on before any establishing shot.
        shot = 'face'; cameraAt.set(lerp(1.37, 1.53, ease(local / 6)), 1.64, .08); target.set(.31, 1.4, 0);
      } else if (local < 7.8) {
        shot = 'bandage'; cameraAt.set(1.26, 1.46, 1.12); target.set(.34, 1.14, .31);
      } else {
        shot = 'observation'; cameraAt.set(3.25, 2.52, 3.7); target.set(-.1, 1.1, 0);
      }
    } else if (frame.id === 'walking') {
      const advance = local < 4 ? local * .13 : local < 7 ? .52 : .52 + (local - 7) * .19;
      fly.position.set(-1.03 + advance, .96 * FLY_SCALE + .03 - frame.stumble * .13, 0);
      fly.rotation.x = frame.stumble * .24; fly.rotation.z = -frame.stumble * .22;
      gait = local < 4 ? 4.2 : local < 7 ? 1.4 : 5.5; stride = .15; rail = true;
      if (local < 3.6) {
        shot = 'rails-front'; cameraAt.set(fly.position.x + 2.65, 1.43, 1.9); target.set(fly.position.x, .49, 0);
      } else if (local < 8) {
        shot = 'stumble'; cameraAt.set(fly.position.x + 1.55, 1.13, 1.95); target.set(fly.position.x + .05, .48, .08);
      } else {
        shot = 'first-steps'; cameraAt.set(2.85, 1.93, 3.6); target.set(.05, .49, 0);
      }
    } else if (frame.id === 'treadmill') {
      fly.position.set(-.1 + Math.sin(local * 2) * .024, .257 + .96 * FLY_SCALE, 0);
      gait = lerp(5, 15, ease(local / 10)); stride = lerp(.13, .27, ease(local / 10));
      fly.rotation.z = .025 + Math.sin(local * gait) * .008;
      if (local < 3.5) {
        shot = 'treadmill-wide'; cameraAt.set(3.1, 2.1, 3.7); target.set(.12, .6, 0);
      } else if (local < 6.5) {
        shot = 'treadmill-feet'; cameraAt.set(.9, 1.05, 1.7); target.set(.13, .5, .17);
      } else {
        shot = 'treadmill-stride'; cameraAt.set(.45, 1.4, 3.4); target.set(.07, .72, 0);
      }
    } else if (frame.id === 'stairs') {
      const travel = ease(local / frame.duration), x = lerp(-1.1, summitX + .85, travel);
      const slope = STEPS.rise / STEPS.tread;
      fly.position.set(x, clamp(x + .18, 0, summitX) * slope + .96 * FLY_SCALE + .025, 0);
      fly.rotation.z = Math.atan(slope) * ease((x + .6) / .6) * (1 - ease((x - summitX + .25) / 1));
      gait = 12; stride = .23; groundAt = stairHeight;
      if (local < 3.4) {
        shot = 'staircase'; cameraAt.set(-6.5, 5, 10.5); target.set(3.5, 2.4, 0);
      } else if (local < 8) {
        shot = 'climb-side'; cameraAt.set(x - .35, fly.position.y + 1.05, 3.6); target.copy(fly.position).add(new THREE.Vector3(.1, .05, 0));
      } else if (local < 11.1) {
        shot = 'climb-front'; cameraAt.set(x + 2.1, fly.position.y + 1.15, .65); target.copy(fly.position).add(new THREE.Vector3(.16, .09, 0));
      } else if (local < 14.5) {
        shot = 'climb-overhead'; cameraAt.set(x - 1.35, fly.position.y + 5.6, 2.15); target.copy(fly.position);
      } else {
        shot = 'summit-approach'; cameraAt.set(summitX + 3.9, summitY + 2.55, 4.1); target.set(x, fly.position.y, 0);
      }
    } else {
      fly.position.set(summitX + .85, summitY + .96 * FLY_SCALE + .025, 0);
      victory = ease((local - 1.5) / 2);
      fly.rotation.z = -.035 * victory;
      const angle = lerp(.58, 0, ease(local / 10));
      const distance = lerp(3.3, 4.4, ease(local / 10));
      shot = 'victory'; cameraAt.set(fly.position.x + Math.cos(angle) * distance, fly.position.y + lerp(1.1, 3.4, ease(local / 10)), Math.sin(angle) * distance);
      target.copy(fly.position).add(new THREE.Vector3(.03, .15, 0));
    }
    fly.position.y += (Math.sin(time * 2) * .005 + neural.motor * Math.sin(time * 8) * .008) * (1 - frame.stumble);
    specimen.pose({ time: reduced ? 0 : time, gait: reduced ? 0 : gait, stride, rail, stumble: frame.stumble, victory, motor: neural.motor, turn: neural.turn, groundAt });
    world.animate(frame, specimen.socket());
    const outside = frame.id === 'stairs' || frame.id === 'victory';
    scene.background.set(outside ? 0xecdcb9 : 0xd9e4d8); scene.fog.color.copy(scene.background);
    sun.color.set(outside ? 0xffc88d : 0xffe3b5);
    sun.position.set(fly.position.x + 1, fly.position.y + 7, 5); sun.target.position.copy(fly.position);
    if (shot !== currentShot) { currentShot = shot; orbitX = orbitY = 0; }
    camera.fov = shot === 'staircase' ? 44 : 40;
    camera.setViewOffset(width, height, shot !== 'staircase' && width > 700 ? width * .14 : 0, height * (shot === 'staircase' ? .04 : .10), width, height);
    camera.updateProjectionMatrix();
    const offset = cameraAt.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += orbitX; spherical.phi = clamp(spherical.phi + orbitY, .12, Math.PI * .9);
    // Leave room for the overlay and retain the close-up on portrait windows.
    spherical.radius *= Math.max(1, .95 / camera.aspect);
    camera.position.copy(target).add(offset.setFromSpherical(spherical)); camera.lookAt(target);
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    lastFrame = frame;
    return { ...frame, shot };
  }
  return {
    render,
    captureFrame() {
      if (!lastFrame) return null;
      specimen.root.updateMatrixWorld(true);
      eyeCamera.position.copy(specimen.eyes());
      const ahead = specimen.head.localToWorld(new THREE.Vector3(4, .1, 0)); eyeCamera.lookAt(ahead);
      const previous = renderer.getRenderTarget(), wasVisible = specimen.root.visible;
      try {
        specimen.root.visible = false;
        renderer.setRenderTarget(sensorTarget); renderer.render(scene, eyeCamera);
        renderer.readRenderTargetPixels(sensorTarget, 0, 0, 90, 160, pixels);
      } finally { specimen.root.visible = wasVisible; renderer.setRenderTarget(previous); }
      return { bytes: pixels.slice(), recovery: { scene: lastFrame.id, attached: lastFrame.attached } };
    },
    orbit(dx, dy) { orbitX -= dx * .005; orbitY -= dy * .003; },
    resetCamera() { orbitX = orbitY = 0; },
    dispose() { sensorTarget.dispose(); renderer.dispose(); }
  };
}

import * as THREE from 'three';
import { createRecoveryFly } from './fly-model.js';
import { createRecoveryWorld } from './recovery-world.js';
import { createMotionResponse } from './motion.js';
import { recoveryFrame, FLY_SCALE, STEPS, ease, lerp, clamp } from './recovery-timeline.js';
import { stairHeight, walkingMotion, treadmillMotion, smoother } from './recovery-timeline.js';
import { recoveryCamera } from './recovery-camera.js';

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
  const smoothTarget = new THREE.Vector3(), smoothCamera = new THREE.Vector3();
  let dissolveTexture = new THREE.FramebufferTexture(1, 1);
  dissolveTexture.colorSpace = THREE.SRGBColorSpace;
  const dissolveScene = new THREE.Scene(), dissolveCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const dissolveMaterial = new THREE.MeshBasicMaterial({ map: dissolveTexture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const dissolveQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dissolveMaterial); dissolveScene.add(dissolveQuad);
  let dissolveTime = 1, cameraReady = false;
  const sensorTarget = new THREE.WebGLRenderTarget(90, 160); sensorTarget.texture.colorSpace = THREE.SRGBColorSpace;
  const pixels = new Uint8Array(90 * 160 * 4);
  let frame = recoveryFrame(0), width = 0, height = 0, orbitX = 0, orbitY = 0, lastFrame = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    width = rect.width; height = rect.height; renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    dissolveTexture.dispose();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    dissolveTexture = new THREE.FramebufferTexture(size.x, size.y);
    dissolveTexture.colorSpace = THREE.SRGBColorSpace;
    dissolveMaterial.map = dissolveTexture; dissolveMaterial.needsUpdate = true;
    dissolveTime = 1;
    camera.updateProjectionMatrix();
  }
  function render(time, dt, state) {
    resize(); frame = recoveryFrame(time);
    const changedRoom = lastFrame && frame.id !== lastFrame.id && !(lastFrame.id === 'stairs' && frame.id === 'victory');
    const seek = lastFrame && (time < lastFrame.time || time - lastFrame.time > .25);
    const changedEdit = lastFrame && frame.id === lastFrame.id && frame.edit !== lastFrame.edit;
    if (changedRoom || changedEdit || seek) {
      // Retain the outgoing observer image before moving the specimen or switching rooms.
      // The eye-camera path below renders the world directly and cannot see this dissolve.
      if (!reduced) {
        // Copy the finished, tone-mapped image so transitions cannot flash brighter.
        renderer.setRenderTarget(null); renderer.render(scene, camera);
        renderer.copyFramebufferToTexture(dissolveTexture);
        dissolveTime = 0;
      }
      cameraReady = false; orbitX = orbitY = 0;
    }
    world.setScene(frame.id);
    const neural = response.step(state, state.paused ? 0 : dt), local = frame.local, motionTime = frame.motionTime;
    const fly = specimen.root, summitX = STEPS.count * STEPS.tread, summitY = STEPS.count * STEPS.rise;
    let gait = 0, phase = 0, stride = .2, rail = false, victory = 0, groundAt = null, terrainTravel = 0, settle = 0;
    fly.rotation.set(0, 0, 0); fly.position.set(0, .837 + .96 * FLY_SCALE, 0);
    if (frame.id === 'unplugged') {
      fly.rotation.z = -.03 * ease((local - 2.6) / 2);
    } else if (frame.id === 'walking') {
      const walk = walkingMotion(local);
      fly.position.set(-1.03 + walk.distance, .96 * FLY_SCALE + .03 - frame.stumble * .11, 0);
      fly.rotation.x = frame.stumble * .19; fly.rotation.z = -frame.stumble * .17;
      gait = walk.cadence; phase = walk.phase; stride = .18; rail = true;
    } else if (frame.id === 'treadmill') {
      phase = treadmillMotion(motionTime).phase;
      fly.position.set(-.1 + Math.sin(local * 1.3) * .012, .257 + .96 * FLY_SCALE, 0);
      gait = lerp(5, 15, ease(motionTime / 10)); stride = lerp(.13, .27, ease(motionTime / 10));
      fly.rotation.z = .025 + Math.sin(phase * 2) * .006;
    } else if (frame.id === 'stairs') {
      const travel = ease(motionTime / 18), x = lerp(-1.1, summitX + .85, travel);
      const slope = STEPS.rise / STEPS.tread;
      fly.position.set(x, clamp(x + .18, 0, summitX) * slope + .96 * FLY_SCALE + .025, 0);
      fly.rotation.z = Math.atan(slope) * ease((x + .6) / .6) * (1 - ease((x - summitX + .25) / 1));
      gait = 12; terrainTravel = x + 1.1; phase = terrainTravel / (STEPS.tread * 2) * Math.PI * 2;
      stride = .23; groundAt = stairHeight; settle = smoother((motionTime - 16.3) / 1.7);
    } else {
      fly.position.set(summitX + .85, summitY + .96 * FLY_SCALE + .025, 0);
      victory = ease((local - .3) / 1.6);
      fly.rotation.z = -.035 * victory;
    }
    // Frame the stable root position, not each small motor-driven body movement.
    const planned = recoveryCamera(frame, fly.position.toArray()), shot = planned.shot;
    cameraAt.set(...planned.position); target.set(...planned.target);
    fly.position.y += (Math.sin(time * 2) * .005 + neural.motor * Math.sin(time * 8) * .008) * (1 - frame.stumble);
    specimen.pose({ time: reduced ? 0 : time, gait: reduced ? 0 : gait, phase: reduced ? 0 : phase, terrainTravel, settle, stride, rail, stumble: frame.stumble, victory, motor: neural.motor, turn: neural.turn, groundAt });
    world.animate(frame, specimen.socket());
    const outside = frame.id === 'stairs' || frame.id === 'victory';
    scene.background.set(outside ? 0xecdcb9 : 0xd9e4d8); scene.fog.color.copy(scene.background);
    sun.color.set(outside ? 0xffc88d : 0xffe3b5);
    sun.position.set(fly.position.x + 1, fly.position.y + 7, 5); sun.target.position.copy(fly.position);
    camera.fov = 40;
    // Compose the specimen above and to the left of its persistent telemetry.
    camera.setViewOffset(width, height, width > 700 ? width * .10 : 0, height * .10, width, height);
    camera.updateProjectionMatrix();
    const offset = cameraAt.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += orbitX; spherical.phi = clamp(spherical.phi + orbitY, .12, Math.PI * .9);
    spherical.radius *= Math.max(1, .95 / camera.aspect);
    cameraAt.copy(target).add(offset.setFromSpherical(spherical));
    if (!cameraReady) { smoothCamera.copy(cameraAt); smoothTarget.copy(target); cameraReady = true; }
    const damping = reduced ? 1 : 1 - Math.exp(-Math.min(dt, .05) / .14);
    smoothCamera.lerp(cameraAt, damping); smoothTarget.lerp(target, damping);
    camera.position.copy(smoothCamera); camera.lookAt(smoothTarget);
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    if (dissolveTime < .32) {
      dissolveTime += Math.max(0, Math.min(dt, .05));
      dissolveMaterial.opacity = 1 - smoother(dissolveTime / .32);
      renderer.autoClear = false;
      try { renderer.render(dissolveScene, dissolveCamera); } finally { renderer.autoClear = true; }
    }
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
    dispose() { sensorTarget.dispose(); dissolveTexture.dispose(); dissolveQuad.geometry.dispose(); dissolveMaterial.dispose(); renderer.dispose(); }
  };
}

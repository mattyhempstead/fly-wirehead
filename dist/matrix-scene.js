import * as THREE from 'three';
import { stations, ROWS, COLUMNS, STATION_COUNT, PITCH_X, PITCH_Z } from './matrix-timeline.js';
import { flyGeometry, FLY_SCALE, FLY_X, FLY_Y, SOCKET } from './matrix-fly.js';
import { bake, builders, roundedRectangle } from './matrix-geometry.js';
import { frontRightLegPose } from './swipe.js';
import { createMotionResponse } from './motion.js';
import { createRestraints } from './matrix-restraints.js';
import { createAtmosphere } from './matrix-atmosphere.js';
import { createOrbitCamera } from './matrix-camera.js';
import { createCampus } from './matrix-campus.js';
import { CAMPUS_CENTER, CAMPUS_SPAN, DETAIL_SPAN, REPRESENTED_FLIES } from './matrix-scale.js';

export function createMatrix(canvas, feed) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030906); scene.fog = new THREE.Fog(0x030906, 60, 148);
  const room = new THREE.Group(); scene.add(room);
  const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, .1, 200);
  scene.add(new THREE.HemisphereLight(0xb3c5a6, 0x102016, 1.2));
  const sun = new THREE.DirectionalLight(0xd5dfc8, 2); sun.position.set(-12, 35, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 110 });
  sun.shadow.normalBias = .04; sun.shadow.bias = -.0002; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fd49a, .95); rim.position.set(20, 15, -20); scene.add(rim);
  const faceLight = new THREE.DirectionalLight(0xe2eee0, 1.2); faceLight.position.set(-22, 9, 22); scene.add(faceLight);
  for (const at of [[-12, 6, 10], [12, 6, -8]]) {
    const powerLight = new THREE.PointLight(0x6cda80, 65, 19, 2); powerLight.position.set(...at); scene.add(powerLight);
  }
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .56, metalness: .32, flatShading: true });
  const wingsMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .57, side: THREE.DoubleSide, depthWrite: false, metalness: .2, roughness: .45 });
  function instances(geometry, material, count = STATION_COUNT, dynamic = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = material === solid; mesh.receiveShadow = true; mesh.frustumCulled = false;
    if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    room.add(mesh); return mesh;
  }
  const unit = new THREE.Object3D();
  function positionCopies(mesh) {
    for (const s of stations) { unit.position.set(s.x, 0, s.z); unit.rotation.set(0, 0, 0); unit.scale.setScalar(1); unit.updateMatrix(); mesh.setMatrixAt(s.id, unit.matrix); }
    mesh.instanceMatrix.needsUpdate = true;
  }
  const base = new THREE.Group(), b = builders(base);
  b.box([5.18, .14, 3.30], [0, .74, 0], 0x1c2a23);
  b.box([5.2, .035, 3.32], [0, .827, 0], 0x243029);
  // Matte pads keep their brightness while orbiting, with a steady fill under
  // the real fly shadows. Chamber fog should not darken them with camera depth.
  const pad = new THREE.Group();
  builders(pad).box([3, .022, 2.65], [-.76, .855, 0], 0x3b5140);
  const padMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x344b3a, emissiveIntensity: .55, fog: false });
  const pads = instances(bake(pad), padMaterial); pads.castShadow = true; positionCopies(pads);
  b.box([5.16, .035, .025], [0, .73, 1.663], 0x2c5237);
  for (const x of [-2.25, 2.25]) {
    b.box([.11, .66, 2.6], [x, .35, 0], 0x101c16);
    b.box([.4, .045, 2.8], [x, .03, 0], 0x0b1510);
  }
  const phone = new THREE.Group(); phone.position.set(1.12, 2.1, 0); phone.rotation.y = -Math.PI / 2; base.add(phone);
  b.mesh(new THREE.ExtrudeGeometry(roundedRectangle(1.47, 2.5, .15), { depth: .09, bevelEnabled: true, bevelSize: .013, bevelThickness: .013, bevelSegments: 2, curveSegments: 5, steps: 1 }), 0x596c73, [0, 0, -.045], phone);
  b.mesh(new THREE.ShapeGeometry(roundedRectangle(1.445, 2.48, .145), 5), 0x071216, [0, 0, .06], phone);
  b.box([.22, .021, .01], [-.025, 1.16, .069], 0x4d7077, phone);
  b.orb([.021, .021, .007], [.17, 1.16, .074], 0x285873, phone, 0);
  b.box([.31, .014, .005], [0, -1.17, .069], 0xadbec0, phone);
  b.box([.023, .25, .05], [.75, .43, 0], 0x7b8d8f, phone);
  // A short wire rises from each crown into a horizontal supply run. There
  // are no tall connector stalks, crossbars, or floor-mounted rail supports.
  const socketX = FLY_X + SOCKET[0] * FLY_SCALE, wireHeight = 2.85;
  b.rod([socketX, wireHeight, -.065], [socketX, wireHeight, .065], .048, 0x536c57);
  const benches = instances(bake(base), solid); positionCopies(benches);
  const factory = new THREE.Group(), f = builders(factory);
  f.box([62, .18, 62], [0, -.13, 0], 0x060d09);
  f.box([64, .26, 64], [0, -.33, 0], 0x050d08);
  const supplyBack = -26.72, supplyFront = (ROWS - 1) / 2 * PITCH_Z + .7;
  for (let column = 0; column < COLUMNS; column++) {
    const x = (column - (COLUMNS - 1) / 2) * PITCH_X + socketX;
    f.rod([x, wireHeight, supplyBack], [x, wireHeight, supplyFront], .028, 0x536c57);
  }
  // The collector stays in the same horizontal plane, at the rear racks.
  const supplyHalfWidth = (COLUMNS - 1) / 2 * PITCH_X + .7;
  f.rod([socketX - supplyHalfWidth, wireHeight, supplyBack], [socketX + supplyHalfWidth, wireHeight, supplyBack], .042, 0x536c57);
  // Clear circulation lanes and safety paint make the regular grid read as a factory.
  for (let col = 0; col <= COLUMNS; col++) {
    const x = (col - COLUMNS / 2) * PITCH_X;
    f.box([.035, .012, ROWS * PITCH_Z + 1], [x, -.025, 0], 0x37513d);
  }
  for (let row = 0; row <= ROWS; row++) {
    const z = (row - ROWS / 2) * PITCH_Z;
    f.box([45.4, .012, .035], [0, -.024, z], 0x29402e);
  }
  for (const z of [-(ROWS * PITCH_Z / 2 + 1), ROWS * PITCH_Z / 2 + 1]) {
    f.box([49, .015, .075], [0, -.02, z], 0x64704a);
    for (let i = -24; i < 25; i += 2) f.box([.9, .018, .22], [i, -.015, z + Math.sign(z) * .35], 0x64704a);
  }
  f.box([61, 20, .28], [0, 9.75, -30.4], 0x0a160e);
  f.box([.28, 20, 62], [30.6, 9.75, 0], 0x0a160e);
  for (let x = -28; x <= 28; x += 7) {
    f.box([.18, 20, .4], [x, 9.75, -30.1], 0x1c3123);
    f.box([4.5, .13, .035], [x, 18.7, -29.92], 0x627c59);
  }
  const environment = new THREE.Mesh(bake(factory), solid); environment.receiveShadow = true; room.add(environment);
  const atmosphere = createAtmosphere(room, stations, { socketX, wireHeight });

  // One texture atlas and one mesh for all independently composited screens.
  const feedTexture = new THREE.CanvasTexture(feed.canvas); feedTexture.colorSpace = THREE.SRGBColorSpace;
  feedTexture.generateMipmaps = false; feedTexture.minFilter = THREE.LinearFilter; feedTexture.magFilter = THREE.LinearFilter;
  const screens = new THREE.Group(), screenBuilder = builders(screens);
  for (const s of stations) {
    const plane = new THREE.PlaneGeometry(1.31, 2.329), uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.column + .003 + uv.getX(i) * .994) / COLUMNS, (ROWS - 1 - s.row + .003 + uv.getY(i) * .994) / ROWS);
    const screen = screenBuilder.mesh(plane, 0xffffff, [s.x + 1.049, 2.1, s.z]); screen.rotation.y = -Math.PI / 2;
  }
  const screenMesh = new THREE.Mesh(bake(screens), new THREE.MeshBasicMaterial({ map: feedTexture, toneMapped: false })); room.add(screenMesh);
  const ids = document.createElement('canvas'); ids.width = COLUMNS * 128; ids.height = ROWS * 128;
  const context = ids.getContext('2d'); context.fillStyle = '#0d1d13'; context.fillRect(0, 0, ids.width, ids.height);
  context.font = '600 48px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#bcd4cc';
  const badges = new THREE.Group(), badgeBuilder = builders(badges);
  for (const s of stations) {
    context.fillText(`${String.fromCharCode(65 + s.row)}${s.column + 1}`, s.column * 128 + 64, s.row * 128 + 64);
    const geometry = new THREE.PlaneGeometry(.43, .43), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.column + uv.getX(i)) / COLUMNS, (ROWS - 1 - s.row + uv.getY(i)) / ROWS);
    const badge = badgeBuilder.mesh(geometry, 0xffffff, [s.x - 2.24, .852, s.z + 1.35]); badge.rotation.x = -Math.PI / 2;
  }
  const idTexture = new THREE.CanvasTexture(ids); idTexture.colorSpace = THREE.SRGBColorSpace;
  room.add(new THREE.Mesh(bake(badges), new THREE.MeshBasicMaterial({ map: idTexture })));
  const geometry = flyGeometry(), bodies = instances(geometry.body, solid, STATION_COUNT, true);
  const restraints = createRestraints(room, stations);
  const wings = geometry.wings.map(geo => instances(geo, wingsMaterial, STATION_COUNT, true));
  const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x283f45, metalness: .3, roughness: .5 });
  const limbBones = instances(new THREE.CylinderGeometry(1, 1, 1, 5), limbMaterial, STATION_COUNT * 3, true);
  const joints = instances(new THREE.IcosahedronGeometry(.055, 0), limbMaterial, STATION_COUNT, true);
  const cables = instances(new THREE.CylinderGeometry(.022, .022, 1, 5), new THREE.MeshStandardMaterial({ color: 0x142b33 }), STATION_COUNT, true);
  const motion = createMotionResponse();
  const body = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const start = new THREE.Vector3(), end = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), socket = new THREE.Vector3();
  const radii = [.034, .022, .013];
  const campus = createCampus(scene, room, screenMesh);
  let lastTextureVersion = -1, width = 0, height = 0;
  // Saved from the user's chosen angle and pan on central station G5.
  // Keep the visible vertical span when adapting that shot to the 16:9 frame.
  const openingView = {
    theta: -.5831104771069833, phi: .9205223878162124,
    span: 3.192613020328341,
    target: [2.1668115331565763, 1.772113300327674, 1.9304575839213705],
  };
  const views = [
    { theta: -.66, phi: 1.10, span: 68, target: [0, 1, 0] },
    { theta: -.85, phi: 1.13, span: 12, target: [-8, 1.5, (ROWS / 2 - 1) * PITCH_Z] },
    openingView,
    { theta: -.55, phi: 1.10, span: CAMPUS_SPAN, target: [...CAMPUS_CENTER] },
  ];
  const controls = createOrbitCamera(views);
  let fittedSpan = 42;
  function render(time, dt, state) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== width || rect.height !== height) { width = rect.width; height = rect.height; renderer.setSize(width, height, false); }
    const orbit = controls.step(dt, state.paused);
    const aspect = width / Math.max(1, height), fit = Math.max(1, 1.48 / aspect);
    fittedSpan = orbit.span * fit / orbit.zoom;
    const detailed = fittedSpan < DETAIL_SPAN || !campus.ready;
    const response = motion.step(state, dt);
    if (detailed) {
      for (const s of stations) {
        const phase = time * (2 + s.phase * .08) + s.phase;
        body.position.set(s.x + FLY_X, FLY_Y + Math.sin(phase) * .009, s.z);
        body.rotation.set(0, 0, Math.sin(phase * .7) * .005);
        body.scale.setScalar(FLY_SCALE); body.updateMatrix(); bodies.setMatrixAt(s.id, body.matrix);
        restraints.pose(s, body.matrix);
        for (let i = 0; i < 2; i++) {
          part.position.set(-.18, .41, .23 * (i ? 1 : -1));
          part.rotation.set((i ? 1 : -1) * Math.sin(time * (10 + s.phase * .2) + s.phase) * (.025 + response.motor * .14), 0, 0);
          part.scale.setScalar(1); part.updateMatrix(); matrix.multiplyMatrices(body.matrix, part.matrix); wings[i].setMatrixAt(s.id, matrix);
        }
        const points = frontRightLegPose(feed.frames[s.id]?.gesture ?? 1);
        for (let i = 0; i < 3; i++) {
          start.set(...points[i]); end.set(...points[i + 1]);
          part.position.copy(start).add(end).multiplyScalar(.5); end.sub(start);
          part.quaternion.setFromUnitVectors(up, end.clone().normalize()); part.scale.set(radii[i], end.length(), radii[i]); part.updateMatrix();
          matrix.multiplyMatrices(body.matrix, part.matrix); limbBones.setMatrixAt(s.id * 3 + i, matrix);
        }
        part.position.set(...points[1]); part.rotation.set(0, 0, 0); part.scale.setScalar(1); part.updateMatrix();
        matrix.multiplyMatrices(body.matrix, part.matrix); joints.setMatrixAt(s.id, matrix);
        socket.set(...SOCKET).applyMatrix4(body.matrix);
        start.copy(socket); start.y = wireHeight;
        part.position.copy(start).add(socket).multiplyScalar(.5); end.copy(socket).sub(start);
        part.quaternion.setFromUnitVectors(up, end.clone().normalize()); part.scale.set(1, end.length(), 1); part.updateMatrix(); cables.setMatrixAt(s.id, part.matrix);
      }
      for (const batch of [bodies, ...wings, limbBones, joints, cables]) batch.instanceMatrix.needsUpdate = true;
      restraints.update();
      atmosphere.animate(time);
    }
    if (lastTextureVersion !== feed.version) { feedTexture.needsUpdate = true; lastTextureVersion = feed.version; }
    if (feed.ready && campus.needsCapture(time, detailed)) campus.capture(renderer, time);
    campus.update(fittedSpan, aspect, orbit);
    camera.left = -fittedSpan * aspect / 2; camera.right = -camera.left;
    camera.top = fittedSpan / 2; camera.bottom = -camera.top;
    const radius = Math.max(72, fittedSpan * 1.4);
    camera.near = .1; camera.far = radius + Math.max(200, fittedSpan * 2);
    camera.updateProjectionMatrix();
    scene.fog.near = radius - 12; scene.fog.far = radius + 76;
    camera.position.set(orbit.target[0] + radius * Math.sin(orbit.phi) * Math.sin(orbit.theta), orbit.target[1] + radius * Math.cos(orbit.phi), orbit.target[2] + radius * Math.sin(orbit.phi) * Math.cos(orbit.theta));
    camera.lookAt(...orbit.target); renderer.render(scene, camera);
  }
  return {
    render,
    startReveal() { controls.startReveal(openingView); },
    cameraState: controls.snapshot,
    setView: controls.setView,
    beginOrbit: controls.beginOrbit,
    orbit: controls.orbit,
    pan: controls.pan,
    resetPan: controls.resetPan,
    zoom: controls.zoom,
    stats() { return { stations: STATION_COUNT, phones: STATION_COUNT, restraints: restraints.count, representedFlies: REPRESENTED_FLIES, ...campus.stats(), view: controls.snapshot().view, camera: controls.snapshot(), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, span: fittedSpan }; },
    dispose() { const seen = new Set(); scene.traverse(node => { for (const resource of [node.geometry, node.material]) if (resource && !seen.has(resource)) { seen.add(resource); resource.dispose(); } }); campus.dispose(); atmosphere.dispose(); feedTexture.dispose(); idTexture.dispose(); renderer.dispose(); }
  };
}

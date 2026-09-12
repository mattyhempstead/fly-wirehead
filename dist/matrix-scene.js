import * as THREE from 'three';
import { stations, ROWS, COLUMNS, STATION_COUNT, PITCH_X, PITCH_Z, clamp } from './matrix-timeline.js';
import { flyGeometry, FLY_SCALE, FLY_X, FLY_Y, SOCKET } from './matrix-fly.js';
import { bake, builders, roundedRectangle } from './matrix-geometry.js';
import { frontRightLegPose } from './swipe.js';
import { createMotionResponse } from './motion.js';
import { createRestraints } from './matrix-restraints.js';
import { createAtmosphere } from './matrix-atmosphere.js';

export function createMatrix(canvas, feed) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030906); scene.fog = new THREE.Fog(0x030906, 60, 148);
  const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, .1, 200);
  scene.add(new THREE.HemisphereLight(0xb3c5a6, 0x102016, 1.2));
  const sun = new THREE.DirectionalLight(0xd5dfc8, 2); sun.position.set(-12, 35, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 30, bottom: -30, near: 1, far: 90 });
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
    scene.add(mesh); return mesh;
  }
  const unit = new THREE.Object3D();
  function positionCopies(mesh) {
    for (const s of stations) { unit.position.set(s.x, 0, s.z); unit.rotation.set(0, 0, 0); unit.scale.setScalar(1); unit.updateMatrix(); mesh.setMatrixAt(s.id, unit.matrix); }
    mesh.instanceMatrix.needsUpdate = true;
  }
  const base = new THREE.Group(), b = builders(base);
  b.box([5.18, .14, 3.30], [0, .74, 0], 0x1c2a23);
  b.box([5.2, .035, 3.32], [0, .827, 0], 0x243029);
  b.box([3, .022, 2.65], [-.76, .855, 0], 0x0e1913);
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
  // The overhead supply ends above the crown; nothing connects to the phone.
  const socketX = FLY_X + SOCKET[0] * FLY_SCALE;
  b.rod([socketX, 3.62, -.97], [socketX, 3.62, 0], .035, 0x536c57);
  b.rod([socketX, 3.69, 0], [socketX, 3.24, 0], .056, 0x1b363e);
  b.rod([socketX, 3.3, 0], [socketX, 3.265, 0], .060, 0xbff3ac);
  const benches = instances(bake(base), solid); positionCopies(benches);
  const factory = new THREE.Group(), f = builders(factory);
  f.box([62, .18, 45], [0, -.13, 0], 0x060d09);
  f.box([64, .26, 47], [0, -.33, 0], 0x050d08);
  for (let row = 0; row < ROWS; row++) {
    const z = (row - 3.5) * PITCH_Z;
    f.box([46, .11, .11], [0, 3.62, z - .97], 0x2c4534);
    f.box([44, .018, .028], [0, 3.685, z - .94], 0x5e8060);
    for (const x of [-23.1, 23.1]) {
      f.box([.12, 3.6, .12], [x, 1.8, z - .97], 0x243a2c);
      f.box([.30, .10, .36], [x, .05, z - .97], 0x395143);
    }
  }
  // Clear circulation lanes and safety paint make the regular grid read as a factory.
  for (let col = 0; col <= COLUMNS; col++) {
    const x = (col - 4) * PITCH_X;
    f.box([.035, .012, 31], [x, -.025, 0], 0x37513d);
  }
  for (let row = 0; row <= ROWS; row++) {
    const z = (row - 4) * PITCH_Z;
    f.box([45.4, .012, .035], [0, -.024, z], 0x29402e);
  }
  for (const z of [-16, 16]) {
    f.box([49, .015, .075], [0, -.02, z], 0x64704a);
    for (let i = -24; i < 25; i += 2) f.box([.9, .018, .22], [i, -.015, z + Math.sign(z) * .35], 0x64704a);
  }
  f.box([61, 20, .28], [0, 9.75, -21.4], 0x0a160e);
  f.box([.28, 20, 44], [30.6, 9.75, 0], 0x0a160e);
  for (let x = -28; x <= 28; x += 7) {
    f.box([.18, 20, .4], [x, 9.75, -21.1], 0x1c3123);
    f.box([4.5, .13, .035], [x, 18.7, -20.92], 0x627c59);
  }
  const environment = new THREE.Mesh(bake(factory), solid); environment.receiveShadow = true; scene.add(environment);
  const atmosphere = createAtmosphere(scene, stations);

  // One texture atlas and one mesh for all 64 independently composited screens.
  const feedTexture = new THREE.CanvasTexture(feed.canvas); feedTexture.colorSpace = THREE.SRGBColorSpace;
  feedTexture.generateMipmaps = false; feedTexture.minFilter = THREE.LinearFilter; feedTexture.magFilter = THREE.LinearFilter;
  const screens = new THREE.Group(), screenBuilder = builders(screens);
  for (const s of stations) {
    const plane = new THREE.PlaneGeometry(1.31, 2.329), uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.column + .003 + uv.getX(i) * .994) / COLUMNS, (ROWS - 1 - s.row + .003 + uv.getY(i) * .994) / ROWS);
    const screen = screenBuilder.mesh(plane, 0xffffff, [s.x + 1.049, 2.1, s.z]); screen.rotation.y = -Math.PI / 2;
  }
  const screenMesh = new THREE.Mesh(bake(screens), new THREE.MeshBasicMaterial({ map: feedTexture, toneMapped: false })); scene.add(screenMesh);
  const ids = document.createElement('canvas'); ids.width = ids.height = 1024;
  const context = ids.getContext('2d'); context.fillStyle = '#0d1d13'; context.fillRect(0, 0, 1024, 1024);
  context.font = '600 48px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#bcd4cc';
  const badges = new THREE.Group(), badgeBuilder = builders(badges);
  for (const s of stations) {
    context.fillText(`${String.fromCharCode(65 + s.row)}${s.column + 1}`, s.column * 128 + 64, s.row * 128 + 64);
    const geometry = new THREE.PlaneGeometry(.43, .43), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.column + uv.getX(i)) / 8, (7 - s.row + uv.getY(i)) / 8);
    const badge = badgeBuilder.mesh(geometry, 0xffffff, [s.x - 2.24, .852, s.z + 1.35]); badge.rotation.x = -Math.PI / 2;
  }
  const idTexture = new THREE.CanvasTexture(ids); idTexture.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(bake(badges), new THREE.MeshBasicMaterial({ map: idTexture })));
  const geometry = flyGeometry(), bodies = instances(geometry.body, solid, STATION_COUNT, true);
  const restraints = createRestraints(scene, stations);
  const wings = geometry.wings.map(geo => instances(geo, wingsMaterial, STATION_COUNT, true));
  const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x283f45, metalness: .3, roughness: .5 });
  const limbBones = instances(new THREE.CylinderGeometry(1, 1, 1, 5), limbMaterial, STATION_COUNT * 3, true);
  const joints = instances(new THREE.IcosahedronGeometry(.055, 0), limbMaterial, STATION_COUNT, true);
  const cables = instances(new THREE.CylinderGeometry(.022, .022, 1, 5), new THREE.MeshStandardMaterial({ color: 0x142b33 }), STATION_COUNT, true);
  const motion = createMotionResponse();
  const body = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const start = new THREE.Vector3(), end = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), socket = new THREE.Vector3();
  const radii = [.034, .022, .013];
  let lastTextureVersion = -1, width = 0, height = 0, cameraView = 0;
  const views = [
    { theta: -.66, phi: .94, span: 42, target: [0, 1, 0] },
    { theta: -.85, phi: 1.13, span: 12, target: [-8, 1.5, 11.25] },
    { theta: -.64, phi: 1.22, span: 5.4, target: [stations[56].x - .3, 1.7, stations[56].z] },
  ];
  const orbit = { ...views[0], target: [...views[0].target] }, desired = { ...orbit, target: [...orbit.target] };
  let zoom = 1, fittedSpan = 42;
  function render(time, dt, state) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== width || rect.height !== height) { width = rect.width; height = rect.height; renderer.setSize(width, height, false); }
    const response = motion.step(state, dt);
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
      socket.set(...SOCKET).applyMatrix4(body.matrix); start.set(s.x + socketX, 3.26, s.z);
      part.position.copy(start).add(socket).multiplyScalar(.5); end.copy(socket).sub(start);
      part.quaternion.setFromUnitVectors(up, end.clone().normalize()); part.scale.set(1, end.length(), 1); part.updateMatrix(); cables.setMatrixAt(s.id, part.matrix);
    }
    for (const batch of [bodies, ...wings, limbBones, joints, cables]) batch.instanceMatrix.needsUpdate = true;
    restraints.update();
    atmosphere.animate(time);
    if (lastTextureVersion !== feed.version) { feedTexture.needsUpdate = true; lastTextureVersion = feed.version; }
    const smoothing = 1 - Math.exp(-Math.min(dt, .05) * 6);
    for (const key of ['theta', 'phi', 'span']) orbit[key] += (desired[key] - orbit[key]) * smoothing;
    orbit.target = orbit.target.map((n, i) => n + (desired.target[i] - n) * smoothing);
    const aspect = width / Math.max(1, height), fit = Math.max(1, 1.48 / aspect);
    fittedSpan = orbit.span * fit / zoom;
    camera.left = -fittedSpan * aspect / 2; camera.right = -camera.left;
    camera.top = fittedSpan / 2; camera.bottom = -camera.top; camera.updateProjectionMatrix();
    const radius = 72;
    camera.position.set(orbit.target[0] + radius * Math.sin(orbit.phi) * Math.sin(orbit.theta), orbit.target[1] + radius * Math.cos(orbit.phi), orbit.target[2] + radius * Math.sin(orbit.phi) * Math.cos(orbit.theta));
    camera.lookAt(...orbit.target); renderer.render(scene, camera);
  }
  return {
    render,
    setView(index) { cameraView = clamp(index, 0, views.length - 1); Object.assign(desired, views[cameraView], { target: [...views[cameraView].target] }); zoom = 1; return cameraView; },
    orbit(dx, dy) { desired.theta -= dx * .004; desired.phi = clamp(desired.phi + dy * .003, .35, 1.45); },
    zoom(delta) { zoom = clamp(zoom * Math.exp(-delta * .001), .65, 4); },
    stats() { return { stations: STATION_COUNT, phones: STATION_COUNT, restraints: restraints.count, view: cameraView, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, span: fittedSpan }; },
    dispose() { const seen = new Set(); scene.traverse(node => { for (const resource of [node.geometry, node.material]) if (resource && !seen.has(resource)) { seen.add(resource); resource.dispose(); } }); atmosphere.dispose(); feedTexture.dispose(); idTexture.dispose(); renderer.dispose(); }
  };
}

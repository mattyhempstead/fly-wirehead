import * as THREE from 'three';
import { STEPS } from './recovery-timeline.js';

// Metre-scale architecture and conventional human rehabilitation equipment.
export function createRecoveryWorld(scene) {
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: .05, ...extra });
  const cream = mat(0xe5e6d7), sage = mat(0x98b2a2), steel = mat(0x839a94, { metalness: .65, roughness: .28 });
  const dark = mat(0x263638), rubber = mat(0x293331, { roughness: 1 }), white = mat(0xf7f3e6);
  function mesh(geo, material, position, parent) { const m = new THREE.Mesh(geo, material); m.position.set(...position); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
  const box = (size, at, material, parent) => mesh(new THREE.BoxGeometry(...size), material, at, parent);
  function rod(a, b, radius, material, parent) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const m = mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 10), material, start.clone().add(end).multiplyScalar(.5).toArray(), parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return m;
  }
  function sign(text, width, height, at, parent, color = '#38504a', background = '#e5e6d7') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 * height / width);
    const c = canvas.getContext('2d'); c.fillStyle = background; c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = color; c.font = `${Math.round(canvas.height * .38)}px monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 512, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }), at, parent);
  }
  function room(label) {
    const g = new THREE.Group(); scene.add(g);
    box([14, .16, 12], [0, -.09, 0], cream, g);
    box([14, 3.6, .15], [0, 1.8, -4.2], mat(0xd6e0d3), g);
    box([.15, 3.6, 12], [-5.2, 1.8, 0], mat(0xc3d3c6), g);
    box([14, .035, .025], [0, 1.02, -4.11], sage, g);
    const grid = new THREE.GridHelper(14, 28, 0xbbc6b8, 0xd0d7c8); grid.position.y = .002; g.add(grid);
    for (const x of [-3, .2, 3.4]) {
      box([2.4, 1.65, .035], [x, 2.35, -4.1], mat(0xc7dfe0, { emissive: 0xc7dfe0, emissiveIntensity: .25 }), g);
      for (const dx of [-1.2, 0, 1.2]) box([.055, 1.73, .07], [x + dx, 2.35, -4.04], white, g);
      for (const y of [1.5, 3.2]) box([2.45, .055, .07], [x, y, -4.04], white, g);
    }
    sign(label, 2.15, .3, [-2.6, 1.23, -4.01], g);
    // A standard chair and wall clock establish the room's human scale.
    box([.48, .055, .48], [3.5, .47, -3.3], sage, g);
    box([.48, .45, .055], [3.5, .73, -3.51], sage, g);
    for (const x of [3.3, 3.7]) for (const z of [-3.5, -3.1]) rod([x, .02, z], [x, .46, z], .018, steel, g);
    const clock = mesh(new THREE.CylinderGeometry(.22, .22, .035, 36), white, [4.95, 2.7, -4.05], g); clock.rotation.x = Math.PI / 2;
    rod([4.95, 2.7, -4.015], [4.95, 2.84, -4.015], .009, dark, g); rod([4.95, 2.7, -4.015], [5.05, 2.66, -4.015], .009, dark, g);
    return g;
  }
  const opening = room('OBSERVATION / 01');
  box([2.5, .12, 1.3], [-.25, .69, 0], steel, opening);
  box([2.45, .095, 1.27], [-.25, .79, 0], mat(0xb8cdb9), opening);
  for (const x of [-1.25, .75]) for (const z of [-.52, .52]) rod([x, .03, z], [x, .65, z], .04, steel, opening);
  rod([-.8, 0, -.95], [-.8, 2.55, -.95], .025, steel, opening);
  rod([-.8, 2.55, -.95], [.1, 2.55, -.1], .025, steel, opening);
  const plug = new THREE.Group(); opening.add(plug);
  mesh(new THREE.CylinderGeometry(.042, .042, .15, 12), dark, [0, .035, 0], plug);
  mesh(new THREE.CylinderGeometry(.022, .022, .055, 12), steel, [0, -.065, 0], plug);
  const cableMaterial = mat(0x243533, { roughness: .5 });
  const cable = mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(.1, 2.55, -.1), new THREE.Vector3(.1, 1.6, 0)), 24, .013, 6), cableMaterial, [0, 0, 0], opening);

  const walking = room('GAIT LAB / 02');
  box([4.3, .025, 1.7], [0, .015, 0], mat(0xadc5b5), walking);
  for (const z of [-.52, .52]) {
    rod([-1.9, .78, z], [1.9, .78, z], .035, steel, walking);
    for (const x of [-1.65, 1.65]) {
      rod([x, .03, z], [x, .78, z], .025, steel, walking);
      box([.28, .025, .32], [x, .023, z], dark, walking);
    }
  }
  for (let i = 0; i < 8; i++) box([.16, .003, .04], [-1.55 + i * .44, .03, .25 * (i % 2 ? 1 : -1)], white, walking);

  const treadmill = room('LOCOMOTION / 03');
  box([3.2, .18, 1.5], [0, .13, 0], dark, treadmill);
  box([2.75, .035, 1.15], [-.12, .236, 0], rubber, treadmill);
  for (const z of [-.68, .68]) {
    box([3.15, .06, .13], [0, .24, z], steel, treadmill);
    rod([1.25, .22, z], [1.37, 1.35, z], .045, steel, treadmill);
    rod([.05, 1.02, z], [1.37, 1.35, z], .035, dark, treadmill);
  }
  const console = box([.48, .13, 1.2], [1.4, 1.38, 0], dark, treadmill); console.rotation.z = -.2;
  const display = sign('REHAB   /   ACTIVE', .84, .17, [1.38, 1.459, 0], treadmill, '#c4f86a', '#1b302b'); display.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  const stripes = Array.from({ length: 19 }, () => box([.008, .002, 1.13], [0, .257, 0], mat(0x58615c), treadmill));
  for (const x of [-1.3, 1.3]) for (const z of [-.55, .55]) box([.18, .05, .16], [x, .02, z], rubber, treadmill);

  const stairs = new THREE.Group(); scene.add(stairs);
  const stone = mat(0xcac7b7), edge = mat(0xece4cb), landing = STEPS.count * STEPS.tread, summit = STEPS.count * STEPS.rise;
  box([80, .22, 70], [8, -.14, 0], mat(0xa4b496), stairs);
  box([7, .05, 10], [-3.5, -.02, 0], stone, stairs);
  for (let i = 0; i < STEPS.count; i++) {
    const height = (i + 1) * STEPS.rise, x = (i + .5) * STEPS.tread;
    box([STEPS.tread, height, STEPS.width], [x, height / 2, 0], stone, stairs);
    box([.025, .012, STEPS.width], [i * STEPS.tread + .018, height + .007, 0], edge, stairs);
  }
  box([8, summit, 10], [landing + 4, summit / 2, 0], stone, stairs);
  for (const z of [-3.04, 3.04]) {
    rod([0, 1.05, z], [landing, summit + 1.05, z], .04, steel, stairs);
    for (let i = 0; i <= STEPS.count; i += 4) rod([i * STEPS.tread, Math.min(summit, (i + 1) * STEPS.rise), z], [i * STEPS.tread, i * STEPS.rise + 1.05, z], .025, steel, stairs);
    rod([landing, summit + 1.05, z], [landing + 5, summit + 1.05, z], .04, steel, stairs);
  }
  // A civic terrace at the top: the stairs stay real and substantial in the final shot.
  for (const z of [-4, 4]) for (const x of [landing + 1.5, landing + 6]) {
    box([.6, 3.3, .6], [x, summit + 1.65, z], cream, stairs);
    box([.8, .18, .8], [x, summit + 3.3, z], edge, stairs);
  }
  const foliage = mat(0x77977d);
  for (let i = 0; i < 16; i++) {
    const x = -6 + i * 2.3, z = (i % 2 ? 1 : -1) * (13 + i % 3);
    rod([x, 0, z], [x, 3, z], .12, mat(0x7c8170), stairs);
    const crown = mesh(new THREE.IcosahedronGeometry(1.8, 1), foliage, [x, 3.4, z], stairs); crown.scale.y = 1.2;
  }
  const groups = { unplugged: opening, walking, treadmill, stairs, victory: stairs };
  return {
    groups,
    setScene(id) { for (const group of new Set(Object.values(groups))) group.visible = group === groups[id]; },
    animate(frame, socket) {
      if (frame.id === 'unplugged') {
        const lift = Math.max(0, Math.min(1, (frame.local - 2.6) / 1.6));
        plug.position.copy(socket).add(new THREE.Vector3(-lift * .18, .06 + lift * .55, -lift * .12));
        plug.rotation.z = lift * .2;
        const end = plug.position.clone().add(new THREE.Vector3(0, .105, 0));
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.1, 2.55, -.1), new THREE.Vector3(.18, 2.25, -.08), end.clone().add(new THREE.Vector3(.04, .2, 0)), end]);
        cable.geometry.dispose(); cable.geometry = new THREE.TubeGeometry(curve, 24, .013, 6);
      }
      const belt = frame.local * (.4 + Math.min(1, frame.local / 12) * .8);
      stripes.forEach((stripe, i) => { stripe.position.x = 1.23 - ((i * .145 + belt) % 2.7); });
    }
  };
}

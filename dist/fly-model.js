import * as THREE from 'three';
import { solveLeg, terrainFoot, bipedFoot, ease, lerp, FLY_SCALE } from './recovery-timeline.js';
const C = { lime: 0xc4f86a };
const seed = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vec = p => new THREE.Vector3(...p);

// The original six-legged, faceted specimen, with independently posed joints.
export function createRecoveryFly() {
  const root = new THREE.Group();
  const material = (color, props = {}) => new THREE.MeshStandardMaterial({ color, roughness: .56, metalness: .28, ...props });
  const dark = material(0x203b37), metal = material(0x78988b, { metalness: .42, roughness: .4 });
  const glow = (color, strength = 1) => material(color, { emissive: color, emissiveIntensity: strength, roughness: .4 });
  const lime = glow(C.lime, 2);
  function mesh(geometry, mat, at, parent = root) { const m = new THREE.Mesh(geometry, mat); m.position.set(...at); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function box(size, at, mat = dark, parent = root) { return mesh(new THREE.BoxGeometry(...size), mat, at, parent); }
  function orb(size, at, mat, parent = root, detail = 2) { const m = mesh(new THREE.IcosahedronGeometry(1, detail), mat, at, parent); m.scale.set(...size); return m; }
  function rod(a, b, radius = .025, mat = metal, parent = root, radial = 6) { const start = vec(a), end = vec(b); const m = mesh(new THREE.CylinderGeometry(radius * .82, radius, start.distanceTo(end), radial), mat, start.clone().add(end).multiplyScalar(.5).toArray(), parent); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return m; }
  function wire(points, radius, mat, parent = root) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vec)), 44, radius, 6, false), mat, [0, 0, 0], parent); }
  function label(text, width, height, at, parent = root, color = '#b3d3c5', bg = '#111e23', font = 22) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * height / width); const ctx = c.getContext('2d'); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); } ctx.font = `${font}px monospace`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; text.split('\n').forEach((s, i, arr) => ctx.fillText(s, 256, c.height / 2 + (i - (arr.length - 1) / 2) * font * 1.65)); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const m = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false }), at, parent); return m; }

  const fly = new THREE.Group(); root.add(fly);
  const shell = material(0x293e46, { flatShading: true, metalness: .3, roughness: .55 });
  const flyMetal = material(0x243239, { metalness: .38, roughness: .48 }), flyDark = material(0x101619, { metalness: .12, roughness: .65 });
  const abdomen = orb([.91, .39, .43], [-.83, -.02, 0], material(0x142429, { flatShading: true, metalness: .24, roughness: .58 }), fly);
  for (let i = 0; i < 5; i++) { const ring = mesh(new THREE.TorusGeometry(.36 - i * .035, .035, 4, 14), material([0x314843, 0x3e493d, 0x304447, 0x39413b, 0x2b3b40][i], { metalness: .3, roughness: .56 }), [-.65 - i * .17, -.01, 0], fly); ring.rotation.y = Math.PI / 2; ring.scale.z = .94; }
  const thorax = orb([.66, .53, .5], [-.05, .08, 0], shell, fly);
  const head = new THREE.Group(); head.position.set(.63, .19, 0); fly.add(head);
  orb([.41, .4, .4], [0, 0, 0], material(0x40515a, { flatShading: true, metalness: .28, roughness: .5 }), head);
  const eyeMaterial = material(0x9e1837, { flatShading: true, roughness: .29, metalness: .45, emissive: 0x3c0614, emissiveIntensity: .4 });
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = orb([.28, .37, .255], [.12, .04, .29 * side], eyeMaterial, head, 2); eyes.push(eye);
    orb([.065, .045, .045], [.21, .25, .47 * side], material(0xe7a8a0, { roughness: .1, emissive: 0x995069 }), head, 1);
    wire([[.25, .3, side * .15], [.48, .49, side * .21], [.7, .57, side * .37]], .012, flyMetal, head);
    orb([.038, .027, .027], [.7, .57, side * .37], flyDark, head, 1);
  }
  rod([.28, -.17, 0], [.51, -.35, 0], .045, flyMetal, head); orb([.06, .08, .11], [.51, -.35, 0], flyDark, head, 1);
  // Fine thorax bristles catch the monitor light.
  for (let i = 0; i < 72; i++) { const a = seed(i + 4) * Math.PI * 2, b = seed(i + 51) * Math.PI; const p = [Math.cos(a) * Math.sin(b) * .64 - .05, Math.abs(Math.cos(b)) * .51 + .1, Math.sin(a) * Math.sin(b) * .49]; if (p[0] > .3) continue; rod(p, [p[0] + (p[0] + .05) * .19, p[1] + .08 + seed(i) * .08, p[2] * 1.14], .006, flyDark, fly, 3); }
  const legs = [];
  const limbs = [];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = new THREE.Group(); fly.add(leg); const x = .33 - i * .46;
    const a = [x, -.17, side * .3], b = [x + (.52 - i * .48), -.37, side * .75], c = [x + (.59 - i * .35), -.94, side * .99], d = [c[0] + .24, -.96, c[2] + side * .08];
    const upper = rod(a, b, .034, flyMetal, leg), joint = orb([.055, .055, .055], b, shell, leg, 1);
    const lower = rod(b, c, .022, flyMetal, leg), foot = rod(c, d, .012, flyDark, leg); legs.push(leg);
    // Forward is +X, so anatomical right is +Z: the visible front leg.
    limbs.push({ side, index: i, group: leg, upper, joint, lower, foot, rest: [a, b, c, d] });
  }
  const boneStart = new THREE.Vector3(), boneEnd = new THREE.Vector3(), boneUp = new THREE.Vector3(0, 1, 0);
  function poseBone(bone, a, b) {
    boneStart.set(...a); boneEnd.set(...b);
    bone.position.copy(boneStart).add(boneEnd).multiplyScalar(.5);
    boneEnd.sub(boneStart);
    bone.scale.y = boneEnd.length() / bone.geometry.parameters.height;
    bone.quaternion.setFromUnitVectors(boneUp, boneEnd.normalize());
  }
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(-.18, .41, .23 * side); fly.add(wing);
    const points = [[0, 0, 0], [-.75, .07, .38 * side], [-1.72, .01, 1.1 * side], [-2.03, -.035, 1.05 * side], [-2.21, -.04, .83 * side], [-1.77, -.03, .41 * side], [-.66, -.015, .03 * side]];
    const vertices = []; for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.computeVertexNormals();
    const m = mesh(geo, material(0xa9dce2, { transparent: true, opacity: .48, side: THREE.DoubleSide, roughness: .2, metalness: .5, flatShading: true }), [0, 0, 0], wing); m.castShadow = false;
    const vein = material(0x77999b, { transparent: true, opacity: .68, metalness: .5 });
    const line = [...points, points[0]]; for (let j = 0; j < line.length - 1; j++) rod(line[j], line[j + 1], .009, vein, wing, 4);
    for (let j = 2; j < 6; j++) rod([-.1, 0, .025 * side], points[j], .006, vein, wing, 3);
    rod([-.83, .01, .31 * side], [-1.23, .025, .7 * side], .007, vein, wing, 3);
    rod([-1.38, -.02, .31 * side], [-1.68, .01, .87 * side], .007, vein, wing, 3);
    wings.push(wing);
  }

  // The implant is seated in the crown between the eyes, not on the thorax.
  mesh(new THREE.CylinderGeometry(.12, .15, .11, 12), metal, [0, .39, 0], head);
  const cranialRing = mesh(new THREE.TorusGeometry(.125, .019, 6, 18), lime, [0, .444, 0], head);
  cranialRing.rotation.x = Math.PI / 2;

  // A cloth wrap follows the anatomical front-right joint, not a world-space prop.
  const right = limbs.find(limb => limb.side === 1 && limb.index === 0);
  const wrap = new THREE.Group(); right.joint.add(wrap);
  // The joint orb is scaled to .055; keep the cloth at its intended model size.
  wrap.scale.setScalar(1 / .055);
  const gauze = material(0xfff9e8, { roughness: 1, metalness: 0 });
  for (let i = 0; i < 5; i++) {
    const strip = mesh(new THREE.CylinderGeometry(.084, .084, .043, 10), gauze, [0, (i - 2) * .035, 0], wrap);
    strip.rotation.z = (i % 2 ? 1 : -1) * .12;
  }
  box([.095, .064, .01], [.018, 0, .083], material(0xe0dccf, { roughness: 1 }), wrap);
  const tmp = new THREE.Vector3();
  let wingPhase = 0, lastPoseTime = null;
  return {
    root, fly, head, limbs,
    socket(target = new THREE.Vector3()) { return head.localToWorld(target.set(0, .47, 0)); },
    eyes(target = new THREE.Vector3()) { return head.localToWorld(target.set(.49, .16, 0)); },
    pose({ time, gait = 0, phase = 0, terrainTravel = 0, settle = 0, stride = .18, rail = false, stumble = 0, victory = 0, motor = 0, turn = 0, groundAt = null, groundY = .04, biped = false }) {
      root.updateMatrixWorld(true);
      const inverseRotation = root.quaternion.clone().invert();
      const elapsed = lastPoseTime === null ? 0 : Math.max(0, Math.min(.05, time - lastPoseTime));
      wingPhase = (wingPhase + elapsed * (19 + motor * 15)) % (Math.PI * 2);
      lastPoseTime = time;
      for (const limb of limbs) {
        const { side, index, rest } = limb;
        const phaseOffset = (index % 2 ? .5 : 0) + (side === 1 ? .5 : 0);
        const cycle = (phase / (Math.PI * 2) + phaseOffset) % 1;
        const swing = Math.min(1, cycle / .42);
        let ankle = [...rest[2]];
        ankle[0] += (cycle < .42 ? lerp(-stride, stride, ease(swing)) : lerp(stride, -stride, (cycle - .42) / .58)) * (gait > 0 ? 1 : 0);
        ankle[1] += Math.sin(Math.PI * swing) ** 2 * .24 * (gait > 0 ? 1 : 0);
        if (groundAt && !(index === 0 && (rail || victory > 0))) {
          tmp.set(...rest[2]); fly.localToWorld(tmp);
          const [x, y] = terrainFoot(terrainTravel, phaseOffset, -1.1 + rest[2][0] * FLY_SCALE, groundAt);
          const standingY = groundAt(tmp.x);
          tmp.x = lerp(x, tmp.x, settle); tmp.y = lerp(y, standingY, settle) + .025;
          ankle = fly.worldToLocal(tmp).toArray();
        }
        if (index === 0 && rail) {
          ankle = [1.02 + Math.cos(phase + phaseOffset * Math.PI * 2) * stride * .3, .65, side * 1.02];
          if (side === 1) { ankle[1] -= stumble * .75; ankle[0] += stumble * .15; }
        } else if (side === 1 && index === 0) {
          ankle[1] -= stumble * .3;
        }
        if (index === 0 && victory > 0) {
          const raised = [.5, .95, side * .92];
          ankle = ankle.map((v, i) => v + (raised[i] - v) * victory);
        }
        if (biped) {
          // Only the hind pair bears weight. The middle pair folds at the waist;
          // the wrapped front pair grips the rails, pumps, or rises in victory.
          const armPhase = phase + (side === 1 ? Math.PI : 0);
          if (index === 2) {
            const foot = gait > 0 ? bipedFoot(phase, side, rail ? .08 : .14) : [-.06, 0, side * .26];
            tmp.set(root.position.x + foot[0], groundY + foot[1], foot[2]);
            if (groundAt) {
              const [x, y] = terrainFoot(terrainTravel, side === 1 ? .5 : 0, -1.16, groundAt);
              const standingX = root.position.x - .06;
              tmp.x = lerp(x, standingX, settle);
              tmp.y = lerp(y, groundAt(standingX), settle) + .04;
            }
          } else if (index === 1) {
            tmp.set(root.position.x - .12, root.position.y - .08, side * .30);
          } else {
            tmp.set(root.position.x + .20 + Math.cos(armPhase) * .06, root.position.y + .04 + Math.sin(armPhase) * .05, side * .36);
            if (rail) tmp.set(root.position.x + .25 + Math.cos(armPhase) * .035, .80 - (side === 1 ? stumble * .23 : 0), side * .52);
            if (victory > 0) tmp.lerp(new THREE.Vector3(root.position.x + .10, root.position.y + .62, side * .40), victory);
          }
          ankle = fly.worldToLocal(tmp).toArray();
        }
        const pose = solveLeg(rest, ankle);
        if (biped) {
          const toeLength = Math.hypot(...rest[3].map((n, i) => n - rest[2][i]));
          const direction = new THREE.Vector3(...(index === 2 ? [1, 0, 0] : [.3, .8, side * .1]));
          direction.applyQuaternion(inverseRotation).normalize().multiplyScalar(toeLength);
          pose[3] = pose[2].map((n, i) => n + direction.getComponent(i));
        } else if (index === 0 && victory > 0) {
          const original = rest[3].map((n, i) => n - rest[2][i]);
          const raisedToe = [.06, .23, side * .08];
          const toe = original.map((n, i) => n + (raisedToe[i] - n) * victory);
          const scale = Math.hypot(...original) / Math.hypot(...toe);
          pose[3] = pose[2].map((n, i) => n + toe[i] * scale);
        }
        poseBone(limb.upper, pose[0], pose[1]); limb.joint.position.set(...pose[1]);
        poseBone(limb.lower, pose[1], pose[2]); poseBone(limb.foot, pose[2], pose[3]);
      }
      head.rotation.y = turn * .13 + Math.sin(time * .9) * .022;
      head.rotation.z = (biped ? -root.rotation.z * .7 : 0) - stumble * .12 + Math.sin(time * 1.8) * .015;
      wings.forEach((wing, i) => {
        wing.rotation.x = (i ? 1 : -1) * (Math.sin(wingPhase) * (.012 + motor * .13) + victory * .1);
        wing.rotation.z = biped ? -.34 : 0;
      });
      // Subtle facet movement suggests blinking without replacing compound eyes.
      const blink = Math.pow(Math.max(0, Math.cos(time * 1.3)), 45);
      eyes.forEach(eye => { eye.scale.y = .37 * (1 - blink * .09); });
    }
  };
}

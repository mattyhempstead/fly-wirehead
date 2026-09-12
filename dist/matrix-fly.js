import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { random } from './matrix-timeline.js';

export const FLY_SCALE = .72, FLY_X = -.75, FLY_Y = 1.558;
export const SOCKET = [.63, .86, 0];

export function flyGeometry() {
  const root = new THREE.Group(), { mesh, orb, rod } = builders(root);
  const shell = 0x293e46, metal = 0x26373b, dark = 0x0e181d;
  orb([.91, .39, .43], [-.83, -.02, 0], 0x142429);
  for (let i = 0; i < 5; i++) {
    const ring = mesh(new THREE.TorusGeometry(.36 - i * .035, .035, 4, 12), [0x314843, 0x3e493d, 0x304447, 0x39413b, 0x2b3b40][i], [-.65 - i * .17, -.01, 0]);
    ring.rotation.y = Math.PI / 2;
  }
  orb([.66, .53, .5], [-.05, .08, 0], shell);
  const head = new THREE.Group(); head.position.set(.63, .19, 0); root.add(head);
  orb([.41, .4, .4], [0, 0, 0], 0x40515a, head);
  for (const side of [-1, 1]) {
    orb([.28, .37, .255], [.12, .04, side * .29], 0xab1336, head, 2);
    orb([.065, .045, .045], [.21, .25, side * .47], 0xf5c0b7, head, 0);
    rod([.25, .3, side * .15], [.48, .49, side * .21], .013, metal, head);
    rod([.48, .49, side * .21], [.7, .57, side * .37], .011, metal, head);
    orb([.038, .027, .027], [.7, .57, side * .37], dark, head, 0);
  }
  rod([.28, -.17, 0], [.51, -.35, 0], .045, metal, head);
  orb([.06, .08, .11], [.51, -.35, 0], dark, head);
  for (let i = 0; i < 30; i++) {
    const a = random(i + 4) * Math.PI * 2, b = random(i + 51) * Math.PI;
    const p = [Math.cos(a) * Math.sin(b) * .60 - .08, Math.abs(Math.cos(b)) * .51 + .1, Math.sin(a) * Math.sin(b) * .49];
    if (p[0] > .3) continue;
    rod(p, [p[0] * 1.14, p[1] + .13, p[2] * 1.14], .008, dark, root, 3);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    if (side === 1 && i === 0) continue; // The swiping foreleg is posed independently.
    const x = .33 - i * .46;
    const a = [x, -.17, side * .3], b = [x + .52 - i * .48, -.37, side * .75];
    const c = [x + .59 - i * .35, -.94, side * .99], d = [c[0] + .24, -.96, c[2] + side * .08];
    rod(a, b, .034, metal); orb([.055, .055, .055], b, shell, root, 0);
    rod(b, c, .022, metal); rod(c, d, .013, dark);
  }
  const harness = mesh(new THREE.TorusGeometry(.515, .03, 5, 14, Math.PI * 1.5), dark, [-.13, .06, 0]); harness.rotation.y = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.12, .15, .11, 10), 0x809e94, [0, .39, 0], head);
  const ring = mesh(new THREE.TorusGeometry(.125, .02, 5, 12), 0xc4f86a, [0, .444, 0], head); ring.rotation.x = Math.PI / 2;
  rod([0, .445, 0], [0, .675, 0], .045, dark, head);
  for (const y of [.49, .545, .6]) mesh(new THREE.CylinderGeometry(.06, .06, .025, 8), 0xa6bfb0, [0, y, 0], head);
  const body = bake(root);
  const wings = [-1, 1].map(side => {
    const group = new THREE.Group(), { mesh, rod } = builders(group);
    const points = [[0, 0, 0], [-.75, .07, .38 * side], [-1.72, .01, 1.1 * side], [-2.03, -.035, 1.05 * side], [-2.21, -.04, .83 * side], [-1.77, -.03, .41 * side], [-.66, -.015, .03 * side]];
    const vertices = [];
    for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    mesh(geometry, 0xb4dce0);
    const outline = [...points, points[0]];
    for (let i = 1; i < outline.length; i++) rod(outline[i - 1], outline[i], .009, 0x446e78, group, 3);
    for (let i = 2; i < 6; i++) rod([-.1, 0, .025 * side], points[i], .007, 0x608b95, group, 3);
    return bake(group);
  });
  return { body, wings };
}

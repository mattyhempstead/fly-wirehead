import * as THREE from 'three';

// Bake a small prototype once, then draw the repeated copies with GPU instancing.
export function bake(root) {
  root.updateMatrixWorld(true);
  const positions = [], normals = [], colors = [], uvs = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
    const color = mesh.material.color;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      colors.push(color.r, color.g, color.b);
      uvs.push(uv?.getX(i) ?? 0, uv?.getY(i) ?? 0);
    }
    geometry.dispose();
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const disposed = new Set();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (const resource of [mesh.geometry, mesh.material]) if (!disposed.has(resource)) { resource.dispose(); disposed.add(resource); }
  });
  geometry.computeBoundingSphere();
  return geometry;
}

export function builders(root) {
  const materials = new Map();
  function mesh(geometry, color, at = [0, 0, 0], parent = root) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshBasicMaterial({ color }));
    const m = new THREE.Mesh(geometry, materials.get(color)); m.position.set(...at); parent.add(m); return m;
  }
  function box(size, at, color, parent = root) { return mesh(new THREE.BoxGeometry(...size), color, at, parent); }
  function orb(size, at, color, parent = root, detail = 1) {
    const m = mesh(new THREE.IcosahedronGeometry(1, detail), color, at, parent); m.scale.set(...size); return m;
  }
  function rod(a, b, radius, color, parent = root, sides = 5) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const m = mesh(new THREE.CylinderGeometry(radius * .84, radius, start.distanceTo(end), sides), color, start.clone().add(end).multiplyScalar(.5).toArray(), parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return m;
  }
  return { mesh, box, orb, rod };
}

export function roundedRectangle(width, height, radius) {
  const x = width / 2, y = height / 2, r = radius, shape = new THREE.Shape();
  shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r); shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y); shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r); shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y); return shape;
}

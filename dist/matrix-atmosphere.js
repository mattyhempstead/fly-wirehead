import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { random } from './matrix-timeline.js';

// Environmental animation only; it never enters the phones or neural input.
export function createAtmosphere(scene, stations, { socketX, wireHeight }) {
  const emission = new THREE.MeshBasicMaterial({ color: 0x8df578, toneMapped: false });
  const stationLight = new THREE.Group(), lightBuilder = builders(stationLight);
  lightBuilder.box([4.7, .021, .033], [0, .717, 1.669], 0xffffff);
  lightBuilder.box([.28, .012, .025], [-1.92, .873, 1.15], 0xffffff);
  const junctionLight = lightBuilder.mesh(new THREE.CylinderGeometry(.049, .049, .022, 8), 0xffffff, [socketX, wireHeight, 0]);
  junctionLight.rotation.x = Math.PI / 2;
  const strips = new THREE.InstancedMesh(bake(stationLight), emission, stations.length), transform = new THREE.Object3D();
  strips.frustumCulled = false;
  for (const s of stations) { transform.position.set(s.x, 0, s.z); transform.updateMatrix(); strips.setMatrixAt(s.id, transform.matrix); }
  scene.add(strips);

  const halo = document.createElement('canvas'); halo.width = halo.height = 128;
  const glowContext = halo.getContext('2d'), gradient = glowContext.createRadialGradient(64, 64, 3, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(158,255,132,.65)'); gradient.addColorStop(.3, 'rgba(79,208,97,.23)'); gradient.addColorStop(1, 'rgba(10,64,26,0)');
  glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 128, 128);
  const haloTexture = new THREE.CanvasTexture(halo); haloTexture.colorSpace = THREE.SRGBColorSpace;
  const spill = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.1, 2.7), new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, opacity: .12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), stations.length);
  spill.frustumCulled = false;
  for (const s of stations) {
    transform.position.set(s.x - .28, .879, s.z); transform.rotation.x = -Math.PI / 2; transform.updateMatrix(); spill.setMatrixAt(s.id, transform.matrix);
  }
  scene.add(spill);

  // Translucent floor mist uses a handful of soft billboards, not a screen filter.
  const mistMaterial = new THREE.SpriteMaterial({ map: haloTexture, color: 0x74957a, transparent: true, opacity: .16, depthWrite: false, toneMapped: false });
  const mist = Array.from({ length: 15 }, (_, i) => {
    const sprite = new THREE.Sprite(mistMaterial);
    sprite.position.set(random(i + 700) * 53 - 26.5, .35 + random(i + 750) * .2, random(i + 810) * 50 - 25);
    sprite.scale.set(9 + random(i + 850) * 8, 1.5 + random(i + 900), 1); scene.add(sprite);
    return { sprite, x: sprite.position.x, z: sprite.position.z, phase: random(i + 925) * 6 };
  });

  function animate(time) {
    for (const cloud of mist) {
      cloud.sprite.position.x = cloud.x + Math.sin(time * .09 + cloud.phase) * 1.5;
      cloud.sprite.position.z = cloud.z + Math.cos(time * .06 + cloud.phase) * .6;
    }
    // A slow, low-amplitude power drift, avoiding abrupt flashes.
    emission.color.setRGB(.46 + Math.sin(time * .42) * .025, .85, .34 + Math.sin(time * .31) * .018, THREE.SRGBColorSpace);
  }
  animate(0);
  return { animate, dispose() { haloTexture.dispose(); } };
}

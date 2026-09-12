import * as THREE from 'three';
import { bake, builders } from './matrix-geometry.js';
import { random } from './matrix-timeline.js';
import { ROOM_WALL_HEIGHT } from './matrix-scale.js';

// Environmental animation only; it never enters the phones or neural input.
export function createAtmosphere(scene, stations, { socketX, wireHeight }) {
  const steel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .43, metalness: .58 });
  const emission = new THREE.MeshBasicMaterial({ color: 0x8df578, toneMapped: false });
  const hardware = new THREE.Group(), h = builders(hardware);
  const lights = new THREE.Group(), l = builders(lights);
  for (let i = 0; i < 10; i++) {
    const x = -25.2 + i * 5.6;
    h.box([3.4, 5.9, 1.5], [x, 2.95, -27.8], 0x14221a);
    h.box([3.0, 5.5, .10], [x, 2.95, -26.99], 0x080f0b);
    for (let slot = 0; slot < 10; slot++) {
      const y = .55 + slot * .48;
      h.box([2.42, .29, .07], [x, y, -26.91], 0x213629);
      l.box([.035, .10, .025], [x + .96, y, -26.85], 0xffffff);
      if (slot % 3 === 0) l.box([.15, .026, .025], [x - .88, y, -26.85], 0xffffff);
    }
    // Uneven cable bundles disappear into the chamber above the processing racks.
    for (let cable = 0; cable < 3; cable++) {
      const dx = (cable - 1) * .34;
      const points = [[x + dx, 5.8, -27.8], [x + dx, 7.1, -27.8], [x + dx + .35, 8.1 + random(i + cable) * 1.2, -28.5], [x + dx + .6, 9.4, -29.95]];
      h.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 18, .052, 5), 0x1f3026);
    }
  }
  for (let i = 0; i < 10; i++) {
    const z = -24 + i * 5.3, x = 27.2;
    h.mesh(new THREE.CylinderGeometry(.78, 1.02, .38, 12), 0x25382b, [x, .2, z]);
    h.mesh(new THREE.CylinderGeometry(.7, .7, 6.4, 12), 0x102019, [x, 3.6, z]);
    for (const y of [.72, 1.45, 5.85, 6.65]) {
      h.mesh(new THREE.CylinderGeometry(.79, .79, .14, 12), 0x3e5441, [x, y, z]);
    }
    h.mesh(new THREE.CylinderGeometry(.68, .78, .45, 12), 0x263c2b, [x, 6.93, z]);
    l.box([.035, 4.1, .36], [x - .712, 3.55, z], 0xffffff);
    h.rod([x, 7.1, z], [29.8, 7.1, z], .09, 0x223c2b);
  }
  hardware.scale.y = lights.scale.y = .62;
  const machinery = new THREE.Mesh(bake(hardware), steel); machinery.receiveShadow = machinery.castShadow = true; scene.add(machinery);
  scene.add(new THREE.Mesh(bake(lights), emission));

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

  const codeCanvas = document.createElement('canvas'); codeCanvas.width = 1024; codeCanvas.height = 512;
  const codeContext = codeCanvas.getContext('2d');
  const codeTexture = new THREE.CanvasTexture(codeCanvas); codeTexture.colorSpace = THREE.SRGBColorSpace;
  codeTexture.generateMipmaps = false; codeTexture.minFilter = THREE.LinearFilter;
  const codeMaterial = new THREE.MeshBasicMaterial({ map: codeTexture, transparent: true, opacity: .95, toneMapped: false, depthWrite: false, fog: false });
  const codeHeight = ROOM_WALL_HEIGHT - .6, codeY = ROOM_WALL_HEIGHT / 2 - .05;
  const codeWall = new THREE.Mesh(new THREE.PlaneGeometry(59, codeHeight), codeMaterial); codeWall.position.set(0, codeY, -30.20); scene.add(codeWall);
  const codeSide = new THREE.Mesh(new THREE.PlaneGeometry(54, codeHeight), codeMaterial); codeSide.position.set(30.38, codeY, -2); codeSide.rotation.y = -Math.PI / 2; scene.add(codeSide);
  const glyphs = '0123456789アイウエオカキクケコサシスセソタチツテトナニヌネノ+-:<>';
  const streams = Array.from({ length: 80 }, (_, i) => ({ x: i * 13, offset: random(i + 200) * 700, speed: 14 + random(i + 220) * 25, length: 7 + Math.floor(random(i + 240) * 17) }));
  let lastCode = -1;
  function animate(time) {
    const tick = Math.floor(time * 10);
    if (tick !== lastCode) {
      lastCode = tick; codeContext.clearRect(0, 0, 1024, 512);
      codeContext.font = 'bold 13px monospace'; codeContext.textAlign = 'center';
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i], head = (stream.offset + time * stream.speed) % 830 - 100;
        for (let j = 0; j < stream.length; j++) {
          const y = head - j * 14;
          if (y < 0 || y > 528) continue;
          codeContext.fillStyle = j === 0 ? 'rgba(209,255,190,1)' : `rgba(107,239,110,${.78 * (1 - j / stream.length)})`;
          codeContext.fillText(glyphs[Math.floor(random(i * 719 + j * 13 + Math.floor(tick / 8)) * glyphs.length)], stream.x, y);
        }
      }
      codeTexture.needsUpdate = true;
    }
    for (const cloud of mist) {
      cloud.sprite.position.x = cloud.x + Math.sin(time * .09 + cloud.phase) * 1.5;
      cloud.sprite.position.z = cloud.z + Math.cos(time * .06 + cloud.phase) * .6;
    }
    // A slow, low-amplitude power drift, avoiding abrupt flashes.
    emission.color.setRGB(.46 + Math.sin(time * .42) * .025, .85, .34 + Math.sin(time * .31) * .018, THREE.SRGBColorSpace);
  }
  animate(0);
  return { animate, dispose() { haloTexture.dispose(); codeTexture.dispose(); } };
}

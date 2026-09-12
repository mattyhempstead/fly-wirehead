import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { wingbeatProfile, wingbeatAngle } from '../dist/matrix-wingbeat.js';
import { rooms } from '../dist/matrix-scale.js';
import { stations } from '../dist/matrix-timeline.js';

// Resolve the browser import map to the same vendored renderer in Node.
registerHooks({ resolve(specifier, context, next) {
  return next(specifier === 'three' ? new URL('../dist/vendor/three.module.js', import.meta.url).href : specifier, context);
} });
const { Group } = await import('../dist/vendor/three.module.js');
const { lowFlyGeometry, createLowFlies } = await import('../dist/matrix-low-fly.js');
const { flyGeometry } = await import('../dist/matrix-fly.js');

test('replica geometry preserves the fly silhouette at less than a quarter of the hero triangle budget', () => {
  const low = lowFlyGeometry(), hero = flyGeometry();
  const triangles = geometries => geometries.reduce((sum, geometry) => sum + geometry.attributes.position.count / 3, 0);
  assert.ok(triangles([low.body, low.wings]) < 900);
  assert.ok(triangles([low.body, low.wings]) < triangles([hero.body, ...hero.wings]) / 4);
  low.body.computeBoundingBox(); hero.body.computeBoundingBox();
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(low.body.boundingBox.min[axis] - hero.body.boundingBox.min[axis]) < .16);
    assert.ok(Math.abs(low.body.boundingBox.max[axis] - hero.body.boundingBox.max[axis]) < .16);
  }
  const { position, wingPivot, wingSide } = low.wings.attributes;
  assert.equal(position.count, wingPivot.count); assert.equal(position.count, wingSide.count);
  assert.deepEqual(new Set(wingSide.array), new Set([-1, 1]));
  for (let i = 0; i < position.count; i++) {
    assert.equal(Math.sign(wingPivot.getZ(i)), wingSide.getX(i));
    assert.ok(Math.abs(wingPivot.getY(i) - .41) < 1e-6);
  }
});

test('flies across rooms have different frequencies and stay spread through the wingbeat cycle', () => {
  const profiles = rooms.slice(0, 81).flatMap(room => stations.map(station => wingbeatProfile(room.id, station.id)));
  assert.equal(new Set(profiles.map(profile => profile.join(','))).size, profiles.length);
  for (const time of [0, 1, 7, 30, 120]) {
    const angles = profiles.map(profile => wingbeatAngle(profile, time, .7));
    const up = angles.filter(angle => angle > 0).length / angles.length;
    assert.ok(up > .45 && up < .55, 'wings are distributed across their cycle, not flapping as a room-wide wave');
    assert.ok(Math.max(...angles) - Math.min(...angles) > .6);
  }
  assert.notDeepEqual(wingbeatProfile(rooms[0].id, 0), wingbeatProfile(rooms[1].id, 0));
});

test('animated replicas remain bounded and update their clocks without uploading new transforms', () => {
  const root = new Group(), flies = createLowFlies(root, rooms.slice(0, 81));
  const [bodies, wings] = root.children;
  const transforms = bodies.instanceMatrix.array.slice(), version = bodies.instanceMatrix.version;
  flies.update(10000, 1, 12, .7);
  assert.equal(flies.count, 80 * stations.length);
  assert.equal(bodies.count, 81 * stations.length);
  flies.update(10000, 1, 12.1, .7);
  assert.equal(bodies.instanceMatrix.version, version);
  assert.deepEqual(bodies.instanceMatrix.array, transforms);
  assert.equal(wings.geometry.attributes.wingMotion.count, bodies.count);
  flies.update(10000, 0, 15, .7);
  assert.equal(flies.count, 0); assert.equal(wings.visible, false);
});

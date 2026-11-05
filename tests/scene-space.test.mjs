import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWorldGalleryProjection } from "../app/_lib/scene/world-gallery.ts";
import { createStarfield } from "../app/_lib/scene/starfield.ts";

const plaza = new THREE.Vector3(0, 5.6, -32);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} should equal ${expected}`);

function cameraAt(position, target = plaza, width = 1440, height = 900, fov = 64) {
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 320);
  camera.position.fromArray(position);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return camera;
}

// Compare actual CSS screen positions to Three's independent WebGL projection.
function cssScreenPoint(projection, localPoint) {
  const values = projection.cameraTransform.match(/matrix3d\(([^)]+)\)/)[1].split(",").map(Number);
  const point = new THREE.Vector4(localPoint[0] + 450, localPoint[1] + 300, localPoint[2], 1)
    .applyMatrix4(new THREE.Matrix4().fromArray(values));
  return [point.x / point.w, point.y / point.w, point.z / point.w];
}

describe("gallery fixed in world space", () => {
  it("matches the scene camera from the front, side, rear, jump and route flight, including portrait screens", () => {
    const gallery = createWorldGalleryProjection(plaza);
    const scenarios = [
      [[4.4, 2.6, 9.1], 1440, 900, 64],
      [[-20, 5, -32], 1440, 900, 64],
      [[0, 3, -55], 1440, 900, 64],
      [[0, 4.3, 10], 1440, 900, 64],
      [[0, 5.1, -19], 1440, 900, 70],
      [[0, 2.6, 10], 390, 844, 72],
    ];
    for (const [position, width, height, fov] of scenarios) {
      const camera = cameraAt(position, plaza, width, height, fov);
      const projection = gallery.project(camera, width, height);
      assert.equal(projection.visible, true);
      for (const point of [[0, 0, 0], [-180, 60, 150], [190, -80, -140]]) {
        const css = cssScreenPoint(projection, point);
        const world = new THREE.Vector3(point[0] * 0.023, -point[1] * 0.023, point[2] * 0.023).add(plaza);
        const ndc = world.project(camera);
        close(css[0], (ndc.x + 1) * width / 2);
        close(css[1], (1 - ndc.y) * height / 2);
      }
    }
  });

  it("foreshortens when seen from the side and grows with proximity instead of following the camera", () => {
    const gallery = createWorldGalleryProjection(plaza);
    const apparentWidth = (camera, width = 1440) => {
      const projection = gallery.project(camera, width, 900);
      const left = cssScreenPoint(projection, [-100, 0, 0]);
      const right = cssScreenPoint(projection, [100, 0, 0]);
      return Math.abs(right[0] - left[0]);
    };
    const distant = apparentWidth(cameraAt([0, 5.6, 12]));
    const closeUp = apparentWidth(cameraAt([0, 5.6, -10]));
    close(closeUp / distant, 2);
    close(apparentWidth(cameraAt([44, 5.6, -32])), 0);
    // Changing viewport width must not change the object's physical size.
    close(apparentWidth(cameraAt([0, 5.6, 12], plaza, 400, 900), 400), distant);
  });

  it("keeps the nearer plates in front in CSS depth order from both sides of the ring", () => {
    const gallery = createWorldGalleryProjection(plaza);
    for (const [position, nearZ] of [[[0, 5.6, 12], 200], [[0, 5.6, -70], -200]]) {
      const projection = gallery.project(cameraAt(position), 1440, 900);
      const near = cssScreenPoint(projection, [0, 0, nearZ]);
      const far = cssScreenPoint(projection, [0, 0, -nearZ]);
      assert.ok(near[2] > far[2], "CSS positive Z must place the closer plate on top");
    }
  });

  it("culls the ring behind the camera or outside the frustum, keeping partly visible rings", () => {
    const gallery = createWorldGalleryProjection(plaza);
    assert.equal(gallery.project(cameraAt([0, 5.6, 12], new THREE.Vector3(0, 5.6, 20)), 1440, 900).visible, false);
    assert.equal(gallery.project(cameraAt([0, 5.6, 400]), 1440, 900).visible, false);
    assert.equal(gallery.project(cameraAt([500, 5.6, 12], new THREE.Vector3(500, 5.6, -32)), 1440, 900).visible, false);
    assert.equal(gallery.project(cameraAt([0, 5.6, 12]), 0, 0).visible, false);
    const edgeCamera = cameraAt([0, 5.6, 12], plaza, 1280, 720);
    const edgePosition = new THREE.Vector3(50, 5.6, -32);
    assert.ok(edgePosition.clone().project(edgeCamera).x > 1);
    assert.equal(createWorldGalleryProjection(edgePosition).project(edgeCamera, 1280, 720).visible, true);
  });
});

describe("procedural starfield", () => {
  it("provides repeatable depth layers with a smaller mobile budget and fills the open rear sky", () => {
    const scenes = [new THREE.Scene(), new THREE.Scene(), new THREE.Scene()];
    const skies = scenes.map((scene, index) => createStarfield(scene, index === 2, false));
    try {
      const [desktop, repeat, mobile] = scenes.map((scene) => scene.getObjectByName("sky-stars"));
      assert.deepEqual(desktop.geometry.attributes.position.array, repeat.geometry.attributes.position.array);
      assert.ok(desktop.geometry.attributes.position.count <= 2000);
      assert.ok(mobile.geometry.attributes.position.count < desktop.geometry.attributes.position.count / 2);
      for (const stars of [desktop, mobile]) {
        const positions = stars.geometry.attributes.position;
        const drift = stars.geometry.attributes.aDrift;
        let rear = 0;
        let nearby = 0;
        for (let i = 0; i < positions.count; i++) {
          const point = new THREE.Vector3().fromBufferAttribute(positions, i);
          assert.ok(Number.isFinite(point.length()));
          assert.ok(point.y > 2.5);
          if (drift.getX(i) > 0) {
            nearby++;
            assert.ok(point.length() >= 54.99 && point.length() <= 88.01);
            assert.ok(point.z > 0);
          } else {
            assert.ok(point.length() >= 114.99 && point.length() <= 185.01);
          }
          if (point.z > 0) rear++;
        }
        assert.ok(nearby > 0 && nearby < positions.count / 5);
        assert.ok(rear > positions.count / 2);
        assert.equal(stars.material.depthTest, true);
        assert.equal(stars.material.depthWrite, false);
        assert.equal(stars.material.fog, false);
      }
    } finally { skies.forEach((sky) => sky.dispose()); }
  });

  it("freezes twinkle and drift for reduced motion while retaining the sky and its entrance fade", () => {
    for (const reduced of [false, true]) {
      const scene = new THREE.Scene();
      const sky = createStarfield(scene, false, reduced);
      const stars = scene.getObjectByName("sky-stars");
      const backdrop = scene.getObjectByName("sky-backdrop");
      sky.update(0.02, 0.5);
      sky.update(0.02, 0.75);
      close(stars.material.uniforms.uTime.value, reduced ? 0 : 0.04);
      assert.equal(stars.material.uniforms.uReveal.value, 0.75);
      assert.equal(backdrop.material.uniforms.uReveal.value, 0.75);
      sky.dispose();
    }
  });

  it("releases both points and backdrop resources exactly once and leaves the existing scene intact", () => {
    const scene = new THREE.Scene();
    const existing = new THREE.Group();
    scene.add(existing);
    const sky = createStarfield(scene, false, false);
    const stars = scene.getObjectByName("sky-stars");
    const backdrop = scene.getObjectByName("sky-backdrop");
    const resources = [stars.geometry, stars.material, backdrop.geometry, backdrop.material];
    const disposals = resources.map(() => 0);
    resources.forEach((resource, index) => resource.addEventListener("dispose", () => disposals[index]++));
    sky.dispose();
    sky.dispose();
    sky.update(0.04, 1);
    assert.deepEqual(scene.children, [existing]);
    assert.deepEqual(disposals, [1, 1, 1, 1]);
    assert.equal(stars.material.uniforms.uTime.value, 0);
  });
});

import { Frustum, Matrix4, Sphere, type Vector3, type PerspectiveCamera } from "three";

// The 900 × 600 CSS artboard has a fixed size in the city. Its tilted plates
// fit the plaza, rather than being resized or turned to face the player.
const WORLD_UNITS_PER_PIXEL = 0.023;
const ORBIT_BOUNDING_RADIUS = 410 * WORLD_UNITS_PER_PIXEL;

function cssMatrix(matrix: Matrix4) {
  return `matrix3d(${matrix.elements.map((value) => Math.abs(value) < 1e-10 ? 0 : value).join(",")})`;
}

export function createWorldGalleryProjection(position: Vector3) {
  // Convert the 900 × 600 CSS artboard (whose Y axis points down) into a
  // fixed world object. The center offset lives in the model matrix so the
  // browser can use one combined projection matrix for the whole artboard.
  const world = new Matrix4().makeScale(WORLD_UNITS_PER_PIXEL, -WORLD_UNITS_PER_PIXEL, WORLD_UNITS_PER_PIXEL);
  world.setPosition(position);
  world.multiply(new Matrix4().makeTranslation(-450, -300, 0));
  const bounds = new Sphere(position.clone(), ORBIT_BOUNDING_RADIUS);
  const screen = new Matrix4();
  const cssCameraProjection = new Matrix4();
  const viewProjection = new Matrix4();
  const frustum = new Frustum();

  return {
    project(camera: PerspectiveCamera, width: number, height: number) {
      if (width <= 0 || height <= 0) return { visible: false, cameraTransform: "none" };
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      const perspective = camera.projectionMatrix.elements[5] * height / 2;
      cssCameraProjection.copy(camera.projectionMatrix);
      // CSS sorts positive Z toward the viewer; WebGL clip depth goes the
      // opposite way. Preserve CSS perspective depth so nearer plates cover
      // farther ones, including when viewing the ring from behind.
      cssCameraProjection.elements[10] = perspective;
      cssCameraProjection.elements[14] = perspective * perspective;
      // clip → top-left CSS pixels; the final homogeneous divide is performed
      // by the browser when it applies matrix3d to the preserved 3D children.
      screen.set(
        width / 2, 0, 0, width / 2,
        0, -height / 2, 0, height / 2,
        0, 0, 1, 0,
        0, 0, 0, 1,
      );
      const cssProjection = screen.multiply(cssCameraProjection).multiply(camera.matrixWorldInverse).multiply(world);
      return {
        visible: frustum.intersectsSphere(bounds),
        // React keeps ownership of the DOM; no renderer reparents the links or
        // their image elements. The matrix includes the fixed world transform.
        cameraTransform: cssMatrix(cssProjection),
      };
    },
  };
}

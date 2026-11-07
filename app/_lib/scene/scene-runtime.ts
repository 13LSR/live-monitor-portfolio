import * as THREE from "three";
import { afterPaint } from "../after-paint.ts";
import type { createSceneEffects } from "./scene-effects";
import { createNeonCity, CITY_LIMIT, WORKS_POSITION } from "./neon-city";
import { introSession } from "./intro-session";
import { flightProgress, type SceneView } from "./camera-flight";
import { createWorldGalleryProjection } from "./world-gallery";
import { createStarfield } from "./starfield";
import { createNpcRuntime } from "./npc-runtime";
import type { NpcDialogue } from "./scene-npcs";
import { createQualityController, QUALITY_SETTINGS, type QualityMode, type SceneQuality } from "./scene-quality.ts";

interface SceneCallbacks {
  onReady(): void;
  onKeys(keys: string[]): void;
  onDialogue(dialogue: NpcDialogue | null): void;
  onQualityChange?(quality: SceneQuality, mode: QualityMode): void;
}

const KEY_MAP: Record<string, string> = {
  ArrowUp: "w", KeyW: "w", ArrowLeft: "a", KeyA: "a",
  ArrowDown: "s", KeyS: "s", ArrowRight: "d", KeyD: "d", Space: "space",
};
const UP = new THREE.Vector3(0, 1, 0);

export function createSceneRuntime(host: HTMLDivElement, callbacks: SceneCallbacks, initialView: SceneView = "home", initialQuality: QualityMode = "auto") {
  const compact = window.matchMedia("(max-width: 767px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const qualityController = createQualityController(compact, initialQuality, applyQuality);
  // A three-quarter opening leaves the left-hand signs clear of the HUD.
  // Narrow screens use a shallower angle to keep the plaza in view.
  const initialYaw = compact ? 0.06 : Math.min(Math.PI / 5, Math.max(0.18, (window.innerWidth / window.innerHeight - 0.5) * 0.42));
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.domElement.className = "immersive-scene__canvas";
  renderer.domElement.setAttribute("aria-label", "可使用方向键或 WASD 移动、空格跳跃、靠近角色后按 F 交谈的霓虹街区");
  renderer.domElement.tabIndex = 0;
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05060c");
  scene.fog = new THREE.Fog("#05060c", 14, 100);
  const camera = new THREE.PerspectiveCamera(compact ? 72 : 64, 1, 0.1, 320);
  camera.position.set(0, 2.6, 7.5).applyAxisAngle(UP, initialYaw).add(new THREE.Vector3(0, 0, 3));
  const cameraTarget = new THREE.Vector3(0, 1.35, -6).applyAxisAngle(UP, initialYaw).add(new THREE.Vector3(0, 0, 3));
  camera.lookAt(cameraTarget);
  const city = createNeonCity(scene, compact);
  const starfield = createStarfield(scene, compact, reducedMotion);
  const npcs = createNpcRuntime(scene, city.obstacles, { reducedMotion, onDialogue: callbacks.onDialogue, deferLoading: true });
  let effects: ReturnType<typeof createSceneEffects> | undefined;
  let effectsLoading = false;

  scene.add(new THREE.HemisphereLight("#bbd4f4", "#17142d", 1.25));
  const keyLight = new THREE.DirectionalLight("#eef2ff", 2.8);
  keyLight.position.set(2, 7, 6);
  scene.add(keyLight);
  const magentaLight = new THREE.PointLight("#ff164d", 25, 25, 2);
  magentaLight.position.set(-6, 3, 1);
  scene.add(magentaLight);
  const cyanLight = new THREE.PointLight("#56cfee", 32, 24, 2);
  cyanLight.position.set(6, 5, -3);
  scene.add(cyanLight);

  const character = new THREE.Group();
  const modelPivot = new THREE.Group();
  character.position.set(0, 0, 3);
  character.add(modelPivot);
  scene.add(character);
  const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 10), new THREE.MeshStandardMaterial({ color: "#abe860", roughness: 0.5 }));
  fallback.position.y = 0.8;
  modelPivot.add(fallback);
  let disposed = false;
  let frame = 0;
  let lastTime = 0;
  let mixer: THREE.AnimationMixer | undefined;
  let action: THREE.AnimationAction | undefined;
  let firstFrameRendered = false;
  let modelsStarted = false;
  let cancelModelStart = () => {};
  let cancelEffectStart = () => {};
  let npcDelay: number | undefined;
  let velocityY = 0;
  let grounded = true;
  let jumpRequested = false;
  let yaw = initialYaw;
  let reveal = introSession.getSnapshot() === 0 ? 1 : 0;
  let view = initialView;
  let flying = false;
  let transitionElapsed = 0;
  let transitionFov = camera.fov;
  const transitionCamera = new THREE.Vector3();
  const transitionTarget = new THREE.Vector3();
  const destinationCamera = new THREE.Vector3();
  const destinationTarget = new THREE.Vector3();
  const homeCamera = camera.position.clone();
  const homeTarget = cameraTarget.clone();
  let destinationFov = camera.fov;
  const desiredCamera = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keyboardHeld = new Set<string>();
  const pointerHeld = new Map<number, string>();
  const held = new Set<string>();
  const pointer = { id: -1, x: 0, startX: 0, startY: 0, moved: false };
  const mouse = new THREE.Vector2();
  const galleryProjection = createWorldGalleryProjection(WORKS_POSITION);
  const galleryViewport = host.querySelector<HTMLElement>(".home-gallery-viewport");
  const galleryCamera = host.querySelector<HTMLElement>(".home-gallery-camera");
  const npcOverlay = host.querySelector<HTMLElement>(".scene-npc-overlay");
  let viewportWidth = 0;
  let viewportHeight = 0;

  function syncEffects() {
    if (!QUALITY_SETTINGS[qualityController.quality].bloom) { effects?.dispose(); effects = undefined; return; }
    if (!firstFrameRendered || disposed || effects || effectsLoading) return;
    effectsLoading = true;
    void import("./scene-effects").then(({ createSceneEffects }) => {
      if (disposed || !QUALITY_SETTINGS[qualityController.quality].bloom) return;
      effects = createSceneEffects(renderer, scene, camera);
      effects.resize(viewportWidth, viewportHeight);
      qualityController.reset();
    }).catch(() => { /* The base renderer remains usable without bloom. */ }).finally(() => { effectsLoading = false; });
  }
  function applyQuality(quality: SceneQuality, mode: QualityMode) {
    const settings = QUALITY_SETTINGS[quality];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
    city.setReflection(settings.reflectionSize);
    starfield.setDensity(settings.starFraction);
    resize();
    syncEffects();
    callbacks.onQualityChange?.(quality, mode);
  }

  function destination() {
    if (view === "works") {
      destinationCamera.set(0, 5.1, -19);
      destinationTarget.copy(WORKS_POSITION);
      destinationFov = compact ? 80 : 70;
    } else if (view === "about") {
      destinationCamera.set(-5, 5.4, -10);
      destinationTarget.set(12, 8, -30);
      destinationFov = compact ? 75 : 68;
    } else {
      destinationCamera.copy(homeCamera);
      destinationTarget.copy(homeTarget);
      destinationFov = compact ? 72 : 64;
    }
  }
  function setView(next: SceneView) {
    if (next === view) return;
    if (view === "home") { homeCamera.copy(camera.position); homeTarget.copy(cameraTarget); }
    view = next;
    if (view === "home") startModels();
    clearKeys();
    introSession.finish();
    transitionCamera.copy(camera.position);
    transitionTarget.copy(cameraTarget);
    transitionFov = camera.fov;
    transitionElapsed = 0;
    destination();
    flying = true;
    host.dataset.flying = "true";
  }
  if (view !== "home") {
    introSession.finish();
    reveal = 1;
    destination();
    camera.position.copy(destinationCamera);
    cameraTarget.copy(destinationTarget);
    camera.fov = destinationFov;
  }

  function disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      mats.forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  }
  function startModels() {
    if (modelsStarted || disposed || view !== "home") return;
    modelsStarted = true;
    cancelModelStart = afterPaint(() => {
      if (disposed) return;
      // Prioritize the player; visitors never block entering or moving around.
      npcDelay = window.setTimeout(() => { if (!disposed) void npcs.startLoading(); }, 2500);
      void import("three/addons/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
        if (disposed) return;
        new GLTFLoader().load("/models/minion-a01.glb", (gltf) => {
          if (disposed) { disposeObject(gltf.scene); return; }
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          model.scale.setScalar(1.9 / Math.max(size.x, size.y, size.z, 0.001));
          const scaledBounds = new THREE.Box3().setFromObject(model);
          const center = scaledBounds.getCenter(new THREE.Vector3());
          model.position.set(-center.x, -scaledBounds.min.y, -center.z);
          modelPivot.remove(fallback);
          disposeObject(fallback);
          modelPivot.add(model);
          const clip = gltf.animations.find((clip) => /walk|run/i.test(clip.name)) ?? gltf.animations[0];
          if (clip) {
            mixer = new THREE.AnimationMixer(model);
            action = mixer.clipAction(clip);
            action.play();
          }
          host.dataset.modelState = "ready";
          window.clearTimeout(npcDelay);
          void npcs.startLoading();
        }, undefined, () => {
          if (!disposed) host.dataset.modelState = "fallback";
          window.clearTimeout(npcDelay);
          if (!disposed) void npcs.startLoading();
        });
      }).catch(() => { if (!disposed) { host.dataset.modelState = "fallback"; void npcs.startLoading(); } });
    });
  }

  const updateKeys = () => {
    held.clear();
    keyboardHeld.forEach((key) => held.add(key));
    pointerHeld.forEach((key) => held.add(key));
    callbacks.onKeys([...held]);
  };
  const clearKeys = () => {
    keyboardHeld.clear();
    pointerHeld.clear();
    jumpRequested = false;
    pointer.id = -1;
    npcs.reset();
    if (npcOverlay) npcOverlay.style.visibility = "hidden";
    updateKeys();
  };
  const npcInteractionEnabled = () => !disposed && !document.hidden && view === "home" && !flying && introSession.getSnapshot() === 0 && reveal > 0.7;
  const interact = () => {
    npcs.update(0, character.position, camera, npcInteractionEnabled());
    npcs.interact();
  };
  const isEditing = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
  const onKeyDown = (event: KeyboardEvent) => {
    if (view !== "home" || flying) return;
    if (event.code === "KeyF") {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || isEditing(event.target) || !npcInteractionEnabled()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) interact();
      return;
    }
    const key = KEY_MAP[event.code];
    if (!key || event.ctrlKey || event.metaKey || event.altKey || isEditing(event.target)) return;
    if (key === "space" && event.target instanceof HTMLElement && event.target.closest("button, a")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (keyboardHeld.has(key)) return;
    if (key === "space") jumpRequested = true;
    keyboardHeld.add(key);
    updateKeys();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const key = KEY_MAP[event.code];
    if (!key || !keyboardHeld.has(key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    keyboardHeld.delete(key);
    updateKeys();
  };
  const onControlDown = (event: PointerEvent) => {
    if (view !== "home" || flying) return;
    const control = (event.target as HTMLElement).closest<HTMLElement>("[data-control]");
    const key = control?.dataset.control;
    if (!control || !key) return;
    event.preventDefault();
    control.setPointerCapture(event.pointerId);
    pointerHeld.set(event.pointerId, key);
    if (key === "space") jumpRequested = true;
    updateKeys();
  };
  const onControlUp = (event: PointerEvent) => {
    if (pointerHeld.delete(event.pointerId)) updateKeys();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || view !== "home" || flying) return;
    renderer.domElement.focus({ preventScroll: true });
    pointer.id = event.pointerId;
    pointer.x = pointer.startX = event.clientX;
    pointer.startY = event.clientY;
    pointer.moved = false;
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointer.id !== event.pointerId) {
      return;
    }
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) pointer.moved = true;
    if (pointer.moved && !flying) yaw -= (event.clientX - pointer.x) * 0.004;
    pointer.x = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointer.id) return;
    pointer.id = -1;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
  };
  const onParallax = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    mouse.set(event.clientX / window.innerWidth * 2 - 1, event.clientY / window.innerHeight * 2 - 1);
  };
  const onPointerCancel = () => { pointer.id = -1; };
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    viewportWidth = width;
    viewportHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    effects?.resize(width, height);
  };
  const animate = (time: number) => {
    if (disposed || document.hidden) return;
    frame = window.requestAnimationFrame(animate);
    const frameTime = time - (lastTime || time);
    if (lastTime && !flying && introSession.getSnapshot() === 0) qualityController.sample(frameTime);
    const dt = Math.min(frameTime / 1000, 0.04);
    lastTime = time;
    const complete = introSession.getSnapshot() === 0;
    reveal = THREE.MathUtils.damp(reveal, complete ? 1 : 0, 3.2, dt);
    (scene.fog as THREE.Fog).near = 7 + reveal * 24;
    (scene.fog as THREE.Fog).far = 19 + reveal * 105;
    city.update(introSession.getProgress(), reveal);
    starfield.update(dt, reveal);
    const moveX = Number(held.has("d")) - Number(held.has("a"));
    const moveZ = Number(held.has("s")) - Number(held.has("w"));
    const moving = view === "home" && !flying && (moveX !== 0 || moveZ !== 0);
    if (flying) {
      transitionElapsed += dt;
      const eased = reducedMotion ? 1 : flightProgress(transitionElapsed);
      camera.position.lerpVectors(transitionCamera, destinationCamera, eased);
      cameraTarget.lerpVectors(transitionTarget, destinationTarget, eased);
      camera.fov = THREE.MathUtils.lerp(transitionFov, destinationFov, eased);
      camera.updateProjectionMatrix();
      if (eased === 1) { flying = false; host.dataset.flying = "false"; }
    } else if (view === "home") {
      if (moving) {
        direction.set(moveX, 0, moveZ).normalize().applyAxisAngle(UP, yaw);
        const nextX = character.position.x + direction.x * 5.5 * dt;
        const nextZ = character.position.z + direction.z * 5.5 * dt;
        const blocked = (x: number, z: number) => npcs.blocks(x, z) || city.obstacles.some((block) => Math.abs(x - block.x) < block.halfWidth + 0.4 && Math.abs(z - block.z) < block.halfDepth + 0.4);
        if (!blocked(nextX, character.position.z)) character.position.x = THREE.MathUtils.clamp(nextX, -CITY_LIMIT, CITY_LIMIT);
        if (!blocked(character.position.x, nextZ)) character.position.z = THREE.MathUtils.clamp(nextZ, -CITY_LIMIT, 18);
        // The supplied GLB faces +Z in its local space.
        character.rotation.y = Math.atan2(direction.x, direction.z);
      }
      if (jumpRequested && grounded) { velocityY = 6.5; grounded = false; }
      jumpRequested = false;
      velocityY -= 18 * dt;
      character.position.y = Math.max(0, character.position.y + velocityY * dt);
      if (character.position.y === 0) { velocityY = 0; grounded = true; }
      desiredTarget.set(0, 1.35, -6).applyAxisAngle(UP, yaw).add(character.position);
      desiredCamera.set(0, 2.6, 7.5).applyAxisAngle(UP, yaw).add(character.position);
      desiredCamera.y -= character.position.y * 0.65;
      desiredTarget.y -= character.position.y * 0.65;
      camera.position.lerp(desiredCamera, 1 - Math.exp(-6 * dt));
      cameraTarget.lerp(desiredTarget, 1 - Math.exp(-7 * dt));
    } else {
      desiredCamera.copy(destinationCamera);
      if (!reducedMotion) { desiredCamera.x += mouse.x * 0.45; desiredCamera.y -= mouse.y * 0.2; }
      camera.position.lerp(desiredCamera, 1 - Math.exp(-3 * dt));
    }
    if (action) action.timeScale = moving ? 1 : 0;
    mixer?.update(dt);
    modelPivot.position.y = reducedMotion || mixer ? 0 : Math.sin(time / (moving ? 95 : 450)) * (moving ? 0.045 : 0.015);
    camera.lookAt(cameraTarget);
    camera.updateMatrixWorld();
    npcs.update(dt, character.position, camera, npcInteractionEnabled());
    npcs.placeOverlay(npcOverlay, camera, viewportWidth, viewportHeight);
    if (galleryViewport && galleryCamera) {
      const projection = galleryProjection.project(camera, viewportWidth, viewportHeight);
      if (galleryCamera.style.transform !== projection.cameraTransform) galleryCamera.style.transform = projection.cameraTransform;
      galleryViewport.style.visibility = projection.visible && reveal > 0.7 && (view === "home" || flying) ? "visible" : "hidden";
    }
    if (effects) effects.render(dt); else renderer.render(scene, camera);
    if (!firstFrameRendered) {
      firstFrameRendered = true;
      callbacks.onReady();
      startModels();
      cancelEffectStart = afterPaint(syncEffects);
    }
  };
  const onVisibilityChange = () => {
    qualityController.reset();
    clearKeys();
    window.cancelAnimationFrame(frame);
    lastTime = 0;
    if (!document.hidden) frame = window.requestAnimationFrame(animate);
  };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("pointermove", onParallax, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  host.addEventListener("pointerdown", onControlDown);
  host.addEventListener("pointerup", onControlUp);
  host.addEventListener("pointercancel", onControlUp);
  host.addEventListener("lostpointercapture", onControlUp);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  applyQuality(qualityController.quality, qualityController.mode);
  frame = window.requestAnimationFrame(animate);

  return {
    setView,
    setQualityMode: qualityController.setMode,
    interact,
    dispose() {
      disposed = true;
      cancelModelStart();
      cancelEffectStart();
      window.clearTimeout(npcDelay);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", clearKeys);
      window.removeEventListener("pointermove", onParallax);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      host.removeEventListener("pointerdown", onControlDown);
      host.removeEventListener("pointerup", onControlUp);
      host.removeEventListener("pointercancel", onControlUp);
      host.removeEventListener("lostpointercapture", onControlUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      mixer?.stopAllAction();
      npcs.dispose();
      if (npcOverlay) npcOverlay.style.visibility = "hidden";
      starfield.dispose();
      city.dispose();
      disposeObject(scene);
      effects?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

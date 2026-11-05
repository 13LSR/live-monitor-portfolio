import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  createNpcConversation, createNpcPlacements, NPC_COLLISION_DISTANCE, NPC_MODEL_PATHS,
  type NpcDialogue, type NpcObstacle, type NpcPlacement,
} from "./scene-npcs.ts";

type NpcModel = { scene: THREE.Group; animations: THREE.AnimationClip[] };
type NpcActor = { placement: NpcPlacement; root: THREE.Group; pivot: THREE.Group; fallback: THREE.Mesh; mixer?: THREE.AnimationMixer };
type NpcOptions = {
  reducedMotion: boolean;
  onDialogue(dialogue: NpcDialogue | null): void;
  loadModel?: (path: string) => Promise<NpcModel>;
  placements?: readonly NpcPlacement[];
  deferLoading?: boolean;
};

// Route changes preserve the runtime; even an admin visit/remount keeps this
// document's placement. A browser reload starts a fresh random arrangement.
let sessionPlacements: NpcPlacement[] | undefined;

function releaseResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
    }
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function createNpcRuntime(scene: THREE.Scene, obstacles: readonly NpcObstacle[], options: NpcOptions) {
  const placements = options.placements ?? (sessionPlacements ??= createNpcPlacements(obstacles));
  const conversation = createNpcConversation(placements);
  const group = new THREE.Group();
  group.name = "street-visitors";
  const templates = new THREE.Group();
  templates.visible = false;
  group.add(templates);
  scene.add(group);
  let disposed = false;
  let elapsed = 0;
  let published: NpcDialogue | null = null;
  const direction = new THREE.Vector3();
  const projection = new THREE.Vector3();
  const marker = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const ray = new THREE.Ray();
  const intersection = new THREE.Vector3();
  const cameraBoxes = obstacles.map((block) => new THREE.Box3(
    new THREE.Vector3(block.x - block.halfWidth, 0, block.z - block.halfDepth),
    new THREE.Vector3(block.x + block.halfWidth, block.height ?? 40, block.z + block.halfDepth),
  ));
  const fallbackGeometry = new THREE.CapsuleGeometry(0.37, 0.76, 4, 10);
  const fallbackMaterials = ["#bba2da", "#75b8c9", "#d4aa78"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  // Keep fallback resources in the owned group after replacement so they are
  // disposed once alongside the shared model geometry, textures and materials.
  fallbackMaterials.forEach((material) => templates.add(new THREE.Mesh(fallbackGeometry, material)));
  const actors: NpcActor[] = placements.map((placement) => {
    const root = new THREE.Group();
    root.name = `visitor-${placement.id}`;
    root.position.set(placement.x, 0, placement.z);
    root.rotation.y = placement.rotation;
    const pivot = new THREE.Group();
    const fallback = new THREE.Mesh(fallbackGeometry, fallbackMaterials[NPC_MODEL_PATHS.indexOf(placement.modelPath)]);
    fallback.position.y = 0.75;
    pivot.add(fallback);
    root.add(pivot);
    group.add(root);
    return { placement, root, pivot, fallback };
  });

  const loadModel = options.loadModel ?? (async (path: string) => {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    return new GLTFLoader().loadAsync(path);
  });
  const loadAsset = async (path: string) => {
    let asset: NpcModel;
    try { asset = await loadModel(path); }
    catch { return; } // The lightweight visitors remain usable on load failure.
    if (disposed) { releaseResources(asset.scene); return; }
    const model = asset.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(1.8 / Math.max(size.x, size.y, size.z, 0.001));
    bounds.setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.add(new THREE.Vector3(-center.x, -bounds.min.y, -center.z));
    templates.add(model);
    const clip = asset.animations.find((animation) => /idle/i.test(animation.name)) ?? asset.animations[0];
    for (const actor of actors) {
      if (actor.placement.modelPath !== path) continue;
      // Object3D.clone alone leaves cloned skinned meshes bound to the source
      // bones. SkeletonUtils keeps every visitor's animation independent.
      const instance = clone(model);
      actor.pivot.remove(actor.fallback);
      actor.pivot.add(instance);
      if (clip) {
        actor.mixer = new THREE.AnimationMixer(instance);
        const action = actor.mixer.clipAction(clip);
        action.play();
        action.setEffectiveTimeScale(0.45);
        actor.mixer.setTime(clip.duration > 0 ? (actor.placement.id * 0.43) % clip.duration : 0);
      }
    }
  };
  let loading: Promise<void> | undefined;
  function startLoading() {
    return loading ??= (async () => {
      for (const path of NPC_MODEL_PATHS) {
        if (disposed) return;
        await loadAsset(path);
        // Yield between models so parsing the next one does not block input.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    })();
  }
  if (!options.deferLoading) void startLoading();

  const publish = () => {
    const next = conversation.getSnapshot();
    if (next === published) return;
    published = next;
    options.onDialogue(next);
  };
  const isVisible = (npc: NpcPlacement, camera: THREE.PerspectiveCamera) => {
    marker.set(npc.x, 2.15, npc.z);
    projection.copy(marker).project(camera);
    if (projection.z < -1 || projection.z > 1 || Math.abs(projection.x) > 0.96 || Math.abs(projection.y) > 0.96) return false;
    direction.subVectors(marker, camera.position);
    const distance = direction.length();
    ray.set(camera.position, direction.normalize());
    return !cameraBoxes.some((box) => ray.intersectBox(box, intersection) && camera.position.distanceToSquared(intersection) < (distance - 0.15) ** 2);
  };

  return {
    get loading() { return loading ?? Promise.resolve(); },
    startLoading,
    update(dt: number, player: THREE.Vector3, camera: THREE.PerspectiveCamera, enabled: boolean) {
      if (disposed) return;
      elapsed += dt;
      conversation.update(player, dt, enabled, (npc) => isVisible(npc, camera));
      const speaker = conversation.getSpeakerId();
      for (const actor of actors) {
        const speaking = actor.placement.id === speaker;
        const yaw = speaking ? Math.atan2(player.x - actor.placement.x, player.z - actor.placement.z) : actor.placement.rotation;
        rotation.setFromAxisAngle(up, yaw);
        if (options.reducedMotion) actor.root.quaternion.copy(rotation);
        else actor.root.quaternion.slerp(rotation, 1 - Math.exp(-7 * dt));
        if (!options.reducedMotion) {
          actor.mixer?.update(dt);
          actor.pivot.position.y = actor.mixer ? 0 : Math.sin(elapsed * 1.7 + actor.placement.id) * 0.035;
        }
      }
      publish();
    },
    interact() {
      if (disposed) return;
      conversation.interact();
      publish();
    },
    reset() {
      conversation.reset();
      publish();
    },
    blocks(x: number, z: number) {
      return placements.some((npc) => (npc.x - x) ** 2 + (npc.z - z) ** 2 < NPC_COLLISION_DISTANCE ** 2);
    },
    placeOverlay(element: HTMLElement | null, camera: THREE.PerspectiveCamera, width: number, height: number) {
      if (!element) return;
      const target = conversation.getTarget();
      if (!target || !width || !height) { element.style.visibility = "hidden"; return; }
      projection.set(target.x, 2.35, target.z).project(camera);
      const x = THREE.MathUtils.clamp((projection.x + 1) * width / 2, 20, width - 20);
      // Reserve enough room above long Chinese sentences on narrow screens.
      const minY = conversation.getSpeakerId() === null ? 110 : Math.min(240, height - 80);
      const y = THREE.MathUtils.clamp((1 - projection.y) * height / 2, minY, height - 80);
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      // Offset a wide bubble at the screen edges without moving its pointer.
      const halfBubble = Math.min(160, (width - 32) / 2);
      const shift = THREE.MathUtils.clamp(x, halfBubble + 16, width - halfBubble - 16) - x;
      element.style.setProperty("--dialogue-shift", `${shift}px`);
      element.style.visibility = "visible";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const actor of actors) {
        actor.mixer?.stopAllAction();
        if (actor.mixer) actor.mixer.uncacheRoot(actor.mixer.getRoot());
      }
      scene.remove(group);
      releaseResources(group);
      conversation.reset();
    },
  };
}

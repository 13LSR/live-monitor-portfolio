import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createNpcConversation, createNpcPlacements, NPC_DIALOGUES, NPC_MODEL_PATHS } from "../app/_lib/scene/scene-npcs.ts";
import { createNpcRuntime } from "../app/_lib/scene/npc-runtime.ts";
import { createNeonCity, CITY_LIMIT } from "../app/_lib/scene/neon-city.ts";

function randomSequence(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function visitor(id, x, z, text = NPC_DIALOGUES[id - 1]) {
  return { id, x, z, text, modelPath: NPC_MODEL_PATHS[(id - 1) % 3], rotation: 0 };
}

function cameraAt(position, target = [0, 1, 0]) {
  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 320);
  camera.position.fromArray(position);
  camera.lookAt(new THREE.Vector3(...target));
  camera.updateMatrixWorld();
  return camera;
}

function disposalCounters(group) {
  const resources = new Set();
  group.traverse((object) => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      Object.values(material).forEach((value) => { if (value?.isTexture) resources.add(value); });
    }
    if (object.isSkinnedMesh) {
      object.skeleton.computeBoneTexture();
      resources.add(object.skeleton.boneTexture);
    }
  });
  const counts = [...resources].map((resource) => {
    const counter = { value: 0 };
    resource.addEventListener("dispose", () => counter.value++);
    return counter;
  });
  return () => counts.map((counter) => counter.value);
}

describe("street visitor placements", () => {
  it("places all seven sayings once in accessible lanes, avoiding the actual generated buildings and plaza", (t) => {
    // City generation only needs a 2D drawing surface for the sign atlas.
    // Stubbing drawing operations lets this test consume its real obstacles
    // without a browser or a GPU.
    const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", { value: { createElement: () => ({ getContext: () => context }) }, configurable: true });
    t.after(() => {
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else delete globalThis.document;
    });
    const scene = new THREE.Scene();
    const city = createNeonCity(scene, false);
    t.after(() => city.dispose());
    const arrangements = new Set();
    for (let seed = 0; seed < 50; seed++) {
      const placements = createNpcPlacements(city.obstacles, randomSequence(seed));
      assert.equal(placements.length, 7);
      assert.equal(new Set(placements.map((npc) => npc.id)).size, 7);
      assert.deepEqual(placements.map((npc) => npc.text).sort(), [...NPC_DIALOGUES].sort());
      assert.equal(new Set(placements.map((npc) => npc.modelPath)).size, 3);
      assert.equal(placements.filter((npc) => npc.z > 0).length, 2);
      for (const npc of placements) {
        assert.ok(npc.x > -CITY_LIMIT && npc.x < CITY_LIMIT && npc.z > -CITY_LIMIT && npc.z < 18);
        assert.ok(Math.hypot(npc.x, npc.z - 3) > 3);
        for (const block of city.obstacles) {
          assert.ok(Math.abs(npc.x - block.x) >= block.halfWidth + 1.5 || Math.abs(npc.z - block.z) >= block.halfDepth + 1.5);
        }
        for (const other of placements) {
          if (npc !== other) assert.ok(Math.hypot(npc.x - other.x, npc.z - other.z) > 4.2);
        }
      }
      arrangements.add(JSON.stringify(placements.map((npc) => [npc.modelPath, npc.text, npc.x, npc.z])));
    }
    assert.ok(arrangements.size > 40);
  });
});

describe("visitor conversation", () => {
  it("requires proximity and visibility and selects one nearby visitor without changing their sentence", () => {
    const npcs = [visitor(1, 0, 0), visitor(2, 3, 0)];
    const conversation = createNpcConversation(npcs);
    conversation.update({ x: 30, y: 0, z: 0 }, 0, true, () => true);
    assert.equal(conversation.interact(), false);
    conversation.update({ x: 1, y: 0, z: 0 }, 0, true, (npc) => npc.id === 2);
    assert.equal(conversation.getSnapshot().id, 2);
    assert.equal(conversation.getSnapshot().text, null);
    assert.equal(conversation.interact(), true);
    const speaking = conversation.getSnapshot();
    assert.equal(speaking.text, NPC_DIALOGUES[1]);
    conversation.update({ x: 0, y: 1.1, z: 0 }, 0.1, true, () => true);
    assert.equal(conversation.getSnapshot(), speaking, "moving closer to another NPC must not steal the open sentence");
    assert.equal(conversation.interact(), false);
  });

  it("does not extend a sentence on repeated input and gives the longest sentence more reading time", () => {
    const conversation = createNpcConversation([visitor(1, 0, 0)]);
    const player = { x: 0, y: 0, z: 2 };
    conversation.update(player, 0, true, () => true);
    conversation.interact();
    conversation.update(player, 4, true, () => true);
    assert.equal(conversation.interact(), false);
    conversation.update(player, 1, true, () => true);
    assert.equal(conversation.getSnapshot().text, null);
    conversation.interact();
    assert.equal(conversation.getSnapshot().text, NPC_DIALOGUES[0]);
    const longest = createNpcConversation([visitor(6, 0, 0)]);
    longest.update(player, 0, true, () => true);
    longest.interact();
    longest.update(player, 5, true, () => true);
    assert.equal(longest.getSnapshot().text, NPC_DIALOGUES[5]);
    longest.update(player, 5, true, () => true);
    assert.equal(longest.getSnapshot().text, null);
  });

  it("closes on leaving, hidden views and route transitions, and never carries pending input back home", () => {
    const npc = visitor(1, 0, 0);
    for (const mode of ["far", "occluded", "inactive", "reset"]) {
      const conversation = createNpcConversation([npc]);
      conversation.update({ x: 0, y: 0, z: 2 }, 0, true, () => true);
      conversation.interact();
      if (mode === "reset") conversation.reset();
      else conversation.update({ x: 0, y: 0, z: mode === "far" ? 6 : 2 }, 0, mode !== "inactive", () => mode !== "occluded");
      assert.equal(conversation.getSnapshot(), null);
      assert.equal(conversation.interact(), false);
      conversation.update({ x: 0, y: 0, z: 2 }, 0, true, () => true);
      assert.equal(conversation.getSnapshot().text, null);
    }
  });
});

async function loadAsset(path) {
  const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
  assert.equal(bytes.subarray(0, 4).toString(), "glTF");
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(json.asset.version, "2.0");
  assert.ok(json.buffers.every((buffer) => !buffer.uri));
  assert.ok(json.images.every((image) => image.bufferView !== undefined));
  // Parse actual supplied meshes, skeletons and clips. Only bitmap decoding
  // is replaced, since node:test has no browser image decoder.
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "test-texture", loadTexture: () => Promise.resolve(new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)) }));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
}

describe("visitor models and lifecycle", () => {
  it("loads each supplied GLB once, shares render resources, animates independent skeletons and releases all of them", async () => {
    const scene = new THREE.Scene();
    const calls = [];
    const placements = createNpcPlacements([], randomSequence(5));
    const runtime = createNpcRuntime(scene, [], {
      placements, reducedMotion: false, onDialogue: () => {},
      loadModel: async (path) => { calls.push(path); return loadAsset(path); },
    });
    await runtime.loading;
    assert.deepEqual(calls, [...NPC_MODEL_PATHS]);
    const twins = placements.filter((npc) => npc.modelPath === NPC_MODEL_PATHS[0]);
    const actors = twins.map((npc) => scene.getObjectByName(`visitor-${npc.id}`));
    const firstMeshes = actors.map((root) => {
      let found;
      root.traverse((object) => { if (!found && object.isSkinnedMesh) found = object; });
      assert.ok(found);
      return found;
    });
    assert.equal(firstMeshes[0].geometry, firstMeshes[1].geometry);
    assert.equal(firstMeshes[0].material, firstMeshes[1].material);
    assert.notEqual(firstMeshes[0].skeleton, firstMeshes[1].skeleton);
    assert.notEqual(firstMeshes[0].skeleton.bones[0], firstMeshes[1].skeleton.bones[0]);
    for (const npc of placements) {
      const root = scene.getObjectByName(`visitor-${npc.id}`);
      assert.ok(root.children[0].children[0].isGroup, "GLB must replace the capsule");
      assert.ok(Math.abs(root.position.x - npc.x) < 1e-8 && Math.abs(root.position.z - npc.z) < 1e-8);
    }
    const poseBefore = firstMeshes[0].skeleton.bones.map((bone) => bone.quaternion.toArray());
    runtime.update(0.3, new THREE.Vector3(0, 0, 3), cameraAt([0, 3, 10]), true);
    assert.notDeepEqual(firstMeshes[0].skeleton.bones.map((bone) => bone.quaternion.toArray()), poseBefore);
    const counts = disposalCounters(scene.getObjectByName("street-visitors"));
    runtime.dispose();
    runtime.dispose();
    assert.deepEqual(scene.children, []);
    assert.ok(counts().every((count) => count === 1), "shared assets and each cloned skeleton must be released exactly once");
  });

  it("keeps fallback visitors interactive if GLBs fail and hides prompts behind buildings or the camera", async () => {
    const npc = visitor(1, 0, 0);
    for (const obstacle of [null, { x: 0, z: 4.5, halfWidth: 3, halfDepth: 0.4, height: 6 }]) {
      const scene = new THREE.Scene();
      let snapshot = null;
      const runtime = createNpcRuntime(scene, obstacle ? [obstacle] : [], {
        placements: [npc], reducedMotion: true, onDialogue: (next) => { snapshot = next; },
        loadModel: async () => { throw new Error("offline"); },
      });
      await runtime.loading;
      const player = new THREE.Vector3(0, 0, 3);
      const camera = cameraAt([0, 3, 7]);
      runtime.update(0, player, camera, true);
      runtime.interact();
      assert.equal(snapshot?.text ?? null, obstacle ? null : NPC_DIALOGUES[0]);
      assert.equal(runtime.blocks(0.8, 0), true);
      assert.equal(runtime.blocks(2, 0), false);
      camera.lookAt(new THREE.Vector3(0, 3, 15));
      camera.updateMatrixWorld();
      runtime.update(0, player, camera, true);
      assert.equal(snapshot, null);
      runtime.dispose();
    }
  });

  it("keeps reduced-motion poses still, turns toward the player, and publishes no per-frame React updates", async () => {
    const scene = new THREE.Scene();
    const npc = visitor(1, 0, 0);
    const snapshots = [];
    const runtime = createNpcRuntime(scene, [], { placements: [npc], reducedMotion: true, onDialogue: (snapshot) => snapshots.push(snapshot), loadModel: loadAsset });
    await runtime.loading;
    const root = scene.getObjectByName("visitor-1");
    const pose = [];
    root.traverse((object) => { if (object.isBone) pose.push(object.quaternion.toArray()); });
    const player = new THREE.Vector3(2, 0, 2);
    const camera = cameraAt([2, 3, 7]);
    runtime.update(0.1, player, camera, true);
    for (let i = 0; i < 10; i++) runtime.update(0.1, player, camera, true);
    assert.equal(snapshots.length, 1);
    runtime.interact();
    runtime.update(0.1, player, camera, true);
    assert.ok(Math.abs(root.rotation.y - Math.PI / 4) < 1e-6);
    const after = [];
    root.traverse((object) => { if (object.isBone) after.push(object.quaternion.toArray()); });
    assert.deepEqual(after, pose);
    runtime.reset();
    assert.equal(snapshots.at(-1), null);
    runtime.dispose();
  });

  it("releases models that arrive after unmount without adding them back or publishing UI state", async () => {
    const scene = new THREE.Scene();
    const resolveLoads = [];
    const callbacks = [];
    const runtime = createNpcRuntime(scene, [], {
      placements: [visitor(1, 0, 0)], reducedMotion: false, onDialogue: (snapshot) => callbacks.push(snapshot),
      loadModel: () => new Promise((resolve) => resolveLoads.push(resolve)),
    });
    runtime.dispose();
    const counts = [];
    for (const resolve of resolveLoads) {
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
      counts.push(disposalCounters(scene));
      resolve({ scene, animations: [] });
    }
    await runtime.loading;
    runtime.update(1, new THREE.Vector3(), cameraAt([0, 2, 7]), true);
    runtime.interact();
    assert.deepEqual(scene.children, []);
    assert.deepEqual(callbacks, []);
    assert.ok(counts.every((count) => count().every((value) => value === 1)));
  });
});

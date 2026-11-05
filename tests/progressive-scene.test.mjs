import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { afterPaint } from "../app/_lib/after-paint.ts";
import { createNpcRuntime } from "../app/_lib/scene/npc-runtime.ts";
import { createNpcPlacements, NPC_MODEL_PATHS } from "../app/_lib/scene/scene-npcs.ts";
import { getTechnology, TECH_STACK_SUGGESTIONS } from "../shared/tech-stack.ts";

it("starts deferred work after the first paint and cancels pending work on unmount", () => {
  const queue = new Map();
  let next = 0;
  const scheduler = {
    requestAnimationFrame(callback) { queue.set(++next, callback); return next; },
    cancelAnimationFrame(id) { queue.delete(id); },
  };
  const frame = () => { const pending = [...queue.values()]; queue.clear(); pending.forEach((fn) => fn(0)); };
  let calls = 0;
  const cancel = afterPaint(() => calls++, scheduler);
  frame();
  assert.equal(calls, 0);
  cancel();
  frame();
  assert.equal(calls, 0);
  afterPaint(() => calls++, scheduler);
  frame();
  assert.equal(calls, 0);
  frame();
  assert.equal(calls, 1);
  frame();
  assert.equal(calls, 1);
});

it("does not fetch NPCs before activation, loads serially once and cancels queued models after disposal", async () => {
  const scene = new THREE.Scene();
  const calls = [];
  const resolvers = [];
  const runtime = createNpcRuntime(scene, [], {
    placements: createNpcPlacements([]), reducedMotion: false, deferLoading: true, onDialogue() {},
    loadModel(path) { calls.push(path); return new Promise((resolve) => resolvers.push(resolve)); },
  });
  assert.equal(calls.length, 0);
  const loading = runtime.startLoading();
  assert.equal(loading, runtime.startLoading());
  assert.deepEqual(calls, [NPC_MODEL_PATHS[0]]);
  const asset = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  let disposed = 0;
  geometry.addEventListener("dispose", () => disposed++);
  asset.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  runtime.dispose();
  resolvers[0]({ scene: asset, animations: [] });
  await loading;
  assert.equal(disposed, 1);
  assert.equal(calls.length, 1);
  assert.deepEqual(scene.children, []);
});

it("recognizes common technology aliases without changing custom technology names", () => {
  for (const [input, icon] of [["react.js", "react"], ["  NEXTJS ", "next"], ["TS", "typescript"], ["Vue 3", "vue"], ["Cloudflare Workers", "cloudflare"]]) {
    assert.equal(getTechnology(input)?.icon, icon);
  }
  assert.equal(getTechnology("My custom framework"), undefined);
  assert.equal(new Set(TECH_STACK_SUGGESTIONS).size, TECH_STACK_SUGGESTIONS.length);
});

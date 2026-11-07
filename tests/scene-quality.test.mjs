import { it } from "node:test";
import assert from "node:assert/strict";
import { createQualityController, isQualityMode } from "../app/_lib/scene/scene-quality.ts";

function frames(controller, milliseconds, count) { for (let i = 0; i < count; i++) controller.sample(milliseconds); }

it("reduces quality for sustained slow frames and waits before recovering", () => {
  const changes = [];
  const controller = createQualityController(false, "auto", (quality) => changes.push(quality));
  frames(controller, 33, 220);
  assert.equal(controller.quality, "medium");
  frames(controller, 16, 1000);
  assert.equal(controller.quality, "medium");
  frames(controller, 16, 1300);
  assert.equal(controller.quality, "high");
  assert.deepEqual(changes, ["medium", "high"]);
});

it("ignores startup spikes and background gaps without turning one stall into a downgrade", () => {
  const controller = createQualityController(false, "auto", () => {});
  frames(controller, 50, 40);
  frames(controller, 16, 400);
  controller.sample(60000);
  frames(controller, 16, 200);
  assert.equal(controller.quality, "high");
  controller.reset();
  frames(controller, 33, 80);
  assert.equal(controller.quality, "high");
});

it("honors manual modes and resumes adaptation only when auto is selected", () => {
  const controller = createQualityController(false, "low", () => {});
  frames(controller, 8, 12000);
  assert.equal(controller.quality, "low");
  controller.setMode("high");
  frames(controller, 100, 500);
  assert.equal(controller.quality, "high");
  controller.setMode("auto");
  frames(controller, 50, 150);
  assert.equal(controller.quality, "medium");
  assert.equal(isQualityMode("ultra"), false);
});

it("starts compact devices at medium and keeps automatic recovery within their budget", () => {
  const controller = createQualityController(true, "auto", () => {});
  frames(controller, 16, 5000);
  assert.equal(controller.quality, "medium");
  frames(controller, 50, 150);
  assert.equal(controller.quality, "low");
  frames(controller, 16, 4000);
  assert.equal(controller.quality, "medium");
});

it("still downgrades a consistently very slow device instead of mistaking every frame for a loading pause", () => {
  const controller = createQualityController(false, "auto", () => {});
  frames(controller, 300, 60);
  assert.equal(controller.quality, "low");
});

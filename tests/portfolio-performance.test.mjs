import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { createPreviewLoadQueue } from "../app/_lib/preview-load-queue.ts";
import { startVisiblePolling } from "../app/_lib/visible-poller.ts";
import { mergeSitesWithStatuses, reconcileSitesWithStatuses } from "../app/_lib/site-mappers.ts";
import { demoSites } from "../app/_data/demo-sites.ts";

it("keeps offline previews stopped while refreshing unchanged sites, and resets changed monitors", () => {
  const site = demoSites[0];
  const previous = mergeSitesWithStatuses([site], { [site.monitorKey]: { up: false, latency: null } }, { monitorDataLoaded: true });
  const renamed = reconcileSitesWithStatuses([{ ...site, name: "Updated name" }], previous);
  assert.equal(renamed[0].name, "Updated name");
  assert.equal(renamed[0].status.isOnline, false);
  assert.equal(renamed[0].status.monitorDataLoaded, true);
  for (const change of [{ url: "https://new.example.com" }, { monitorKey: "different" }]) {
    assert.equal(reconcileSitesWithStatuses([{ ...site, ...change }], previous)[0].status.isOnline, null);
  }
  assert.deepEqual(reconcileSitesWithStatuses([], previous), []);
});

class Visibility extends EventTarget {
  hidden = false;
  change(hidden) {
    this.hidden = hidden;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

describe("preview loading budget", () => {
  it("starts at most two previews, releases slots and removes cancelled requests", async () => {
    const queue = createPreviewLoadQueue(2);
    const started = [];
    const tickets = [0, 1, 2, 3].map((id) => queue.request(() => started.push(id)));
    tickets[2].release();
    await setImmediate();
    assert.deepEqual(started, [0, 1]);
    tickets[0].release();
    tickets[0].release();
    await setImmediate();
    assert.deepEqual(started, [0, 1, 3]);
  });

  it("does not start queued previews while the page is hidden", async () => {
    const queue = createPreviewLoadQueue(1);
    const started = [];
    queue.setPaused(true);
    const first = queue.request(() => started.push(1));
    queue.request(() => started.push(2));
    await setImmediate();
    assert.deepEqual(started, []);
    queue.setPaused(false);
    await setImmediate();
    assert.deepEqual(started, [1]);
    queue.setPaused(true);
    first.release();
    await setImmediate();
    assert.deepEqual(started, [1]);
    queue.setPaused(false);
    await setImmediate();
    assert.deepEqual(started, [1, 2]);
  });
});

describe("visibility-aware polling", () => {
  it("starts only when visible and stops polling after cleanup", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const visibility = new Visibility();
    visibility.hidden = true;
    let calls = 0;
    const stop = startVisiblePolling(async () => { calls += 1; }, { visibility });
    t.after(stop);
    t.mock.timers.tick(120_000);
    assert.equal(calls, 0);
    visibility.change(false);
    await setImmediate();
    assert.equal(calls, 1);
    t.mock.timers.tick(60_000);
    await setImmediate();
    assert.equal(calls, 2);
    stop();
    t.mock.timers.tick(120_000);
    visibility.change(false);
    await setImmediate();
    assert.equal(calls, 2);
  });

  it("aborts hidden requests and waits for them to settle before the resumed refresh", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const visibility = new Visibility();
    const pending = [];
    const signals = [];
    const stop = startVisiblePolling((signal) => {
      signals.push(signal);
      return new Promise((resolve) => pending.push(resolve));
    }, { visibility });
    t.after(stop);
    t.mock.timers.tick(180_000);
    assert.equal(signals.length, 1);
    visibility.change(true);
    assert.equal(signals[0].aborted, true);
    visibility.change(false);
    assert.equal(signals.length, 1);
    pending.shift()();
    await setImmediate();
    assert.equal(signals.length, 2);
    pending.shift()();
    await setImmediate();
    t.mock.timers.tick(59_999);
    assert.equal(signals.length, 2);
    t.mock.timers.tick(1);
    assert.equal(signals.length, 3);
    stop();
    assert.equal(signals[2].aborted, true);
    pending.shift()();
    await setImmediate();
    t.mock.timers.tick(120_000);
    assert.equal(signals.length, 3);
  });
});

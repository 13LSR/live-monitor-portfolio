import { it } from "node:test";
import assert from "node:assert/strict";
import { createIntroSession } from "../app/_lib/scene/intro-session.ts";

it("enters the scene after five seconds even without keyboard input", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 0 });
  const session = createIntroSession();
  t.after(session.finish);
  session.start();
  t.mock.timers.tick(4000);
  assert.equal(session.getSnapshot(), 1);
  assert.equal(session.getProgress(), 0.8);
  t.mock.timers.tick(1000);
  assert.equal(session.getSnapshot(), 0);
  assert.equal(session.getProgress(), 1);
});

it("preserves countdown completion across remounts but resets in a new document", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 0 });
  const session = createIntroSession();
  t.after(session.finish);
  let notifications = 0;
  const unsubscribe = session.subscribe(() => notifications++);
  session.start();
  t.mock.timers.tick(2000);
  session.start(); // React Strict Mode / remount must not reset the clock.
  t.mock.timers.tick(3000);
  assert.equal(session.getSnapshot(), 0);
  unsubscribe();
  const beforeReturn = notifications;
  session.start();
  t.mock.timers.tick(5000);
  assert.equal(session.getSnapshot(), 0);
  assert.equal(notifications, beforeReturn);
  assert.equal(createIntroSession().getSnapshot(), 5); // Browser reload.
});

it("skipping or leaving for another section prevents a later restart", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 0 });
  const session = createIntroSession();
  session.finish();
  session.start();
  t.mock.timers.tick(6000);
  assert.equal(session.getSnapshot(), 0);
});

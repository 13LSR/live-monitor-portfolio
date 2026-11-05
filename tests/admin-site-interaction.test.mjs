import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as formUtils from "../app/_lib/site-form-utils.ts";
import * as siteCover from "../shared/site-cover.ts";
import { createSessionCookie } from "../worker/src/cookies.ts";
import worker from "../worker/src/index.ts";
import { createTestDatabase } from "./helpers/d1.mjs";

const require = createRequire(import.meta.url);
const formCode = ts.transpileModule(
  readFileSync(new URL("../app/_components/admin-site-form.tsx", import.meta.url), "utf8"),
  { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const site = {
  id: 1, name: "Interactive site", slug: "interactive-site", url: "https://example.com",
  monitorKey: null, category: "web", description: "Preview interaction regression",
  summary: "", tags: [], techStack: [], isFeatured: false, repoUrl: null,
  fallbackUrl: null, coverUrl: null, coverMode: "iframe", sortOrder: 0,
  isVisible: true, allowInteraction: false, createdAt: "", updatedAt: "",
};

// Delay state updaters until after the change event and controlled input reset.
// This exercises the real form handlers without depending on a browser scheduler.
function mountEditor(initialSite, onSubmit) {
  const states = [];
  const updates = [];
  let hookIndex = 0;
  const exports = {};
  runInNewContext(formCode, {
    exports,
    require(id) {
      if (id === "react") return {
        useState(initial) {
          const index = hookIndex++;
          if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
          return [states[index], (update) => updates.push(() => {
            states[index] = typeof update === "function" ? update(states[index]) : update;
          })];
        },
      };
      if (id === "animal-island-ui") return { Button: "button", Card: "section", Tag: "span" };
      if (id === "@/app/_components/site-cover") return { SiteCover: "img" };
      if (id === "@/shared/site-cover") return siteCover;
      if (id === "@/app/_lib/site-form-utils") return formUtils;
      return require(id);
    },
  });
  function render() {
    hookIndex = 0;
    return exports.AdminSiteForm({ mode: "edit", initialSite, pending: false, onSubmit });
  }
  let tree = render();
  return {
    getCheckbox(title) {
      const card = findElement(tree, (element) => element.props.title === title);
      assert.ok(card, `Missing toggle: ${title}`);
      return card.props.children;
    },
    changeCheckbox(title, checked) {
      const checkbox = this.getCheckbox(title);
      const target = { checked };
      const event = { target, currentTarget: target };
      checkbox.props.onChange(event);
      target.checked = checkbox.props.checked;
      event.currentTarget = null;
      updates.splice(0).forEach((update) => update());
      tree = render();
    },
    submit() { return tree.props.onSubmit({ preventDefault() {} }); },
  };
}

function findElement(element, predicate) {
  if (Array.isArray(element)) {
    for (const child of element) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (!element?.props) return null;
  return predicate(element) ? element : findElement(element.props.children, predicate);
}

for (const [title, field] of [
  ["允许交互模式", "allowInteraction"],
  ["公开展示", "isVisible"],
  ["首页精选", "isFeatured"],
]) {
  it(`submits both values for ${field} even when the input resets before the updater runs`, async () => {
    for (const checked of [true, false]) {
      let submitted;
      const editor = mountEditor({ ...site, [field]: !checked }, async (payload) => {
        submitted = payload;
        return true;
      });
      editor.changeCheckbox(title, checked);
      assert.equal(editor.getCheckbox(title).props.checked, checked);
      await editor.submit();
      assert.equal(submitted[field], checked);
      assert.equal(submitted.name, site.name);
      assert.equal(submitted.url, site.url);
    }
  });
}

it("preserves interaction permission through form edits, authenticated writes, public reads and reopening", async (t) => {
  const { db, binding } = createTestDatabase(t);
  const origin = "https://portfolio.example.com";
  const secret = "interaction-regression-test-secret";
  const env = { DB: binding, ADMIN_PASSWORD: "test-password", SESSION_SECRET: secret, ALLOWED_ORIGINS: origin };
  const cookie = `admin_session=${await createSessionCookie(secret)}`;
  const mutate = (path, method, payload) => worker.fetch(new Request(`https://api.example.com${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }), env);
  const list = async (includeHidden) => {
    const response = await worker.fetch(new Request(`https://api.example.com/sites${includeHidden ? "?includeHidden=1" : ""}`, {
      headers: includeHidden ? { Origin: origin, Cookie: cookie } : {},
    }), env);
    assert.equal(response.status, 200);
    return (await response.json()).sites;
  };

  const created = await mutate("/sites", "POST", formUtils.buildSitePayloadForSubmit({ ...site, allowInteraction: true }));
  assert.equal(created.status, 200);
  let saved = (await list(true))[0];
  assert.equal(saved.allowInteraction, true);
  assert.equal((await list(false))[0].allowInteraction, true);

  for (const checked of [false, true]) {
    const editor = mountEditor(saved, async (payload) => {
      const response = await mutate(`/sites/${saved.id}`, "PUT", payload);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ok, true);
      return true;
    });
    editor.changeCheckbox("允许交互模式", checked);
    await editor.submit();
    saved = (await list(true))[0];
    assert.equal(saved.allowInteraction, checked);
    assert.equal((await list(false))[0].allowInteraction, checked);
    assert.equal(db.prepare("SELECT allow_interaction FROM sites WHERE id = ?").get(saved.id).allow_interaction, Number(checked));
    const reopened = mountEditor(saved, async () => true);
    assert.equal(reopened.getCheckbox("允许交互模式").props.checked, checked);
  }
});

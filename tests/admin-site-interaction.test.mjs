import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as formUtils from "../app/_lib/site-form-utils.ts";
import * as siteCover from "../shared/site-cover.ts";
import * as techStack from "../shared/tech-stack.ts";
import { emptyArchitecture } from "../shared/site-architecture.ts";
import { verifySavedSite } from "../app/_lib/site-save-verification.ts";
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
        useEffect() {},
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
      if (id === "@/shared/tech-stack") return techStack;
      if (id === "@/app/_components/tech-stack-label") return { TechStackLabel: "span" };
      if (id === "./admin-architecture-editor") return { AdminArchitectureEditor: "architecture-editor" };
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
    getField(label) {
      const field = findElement(tree, (element) => element.props.label === label);
      assert.ok(field, `Missing field: ${label}`);
      return field;
    },
    changeArchitecture(value) {
      const editor = findElement(tree, (element) => element.type === "architecture-editor");
      editor.props.onChange(value);
      updates.splice(0).forEach((update) => update());
      tree = render();
    },
    getArchitecture() { return findElement(tree, (element) => element.type === "architecture-editor").props.value; },
    changeField(label, value) {
      const field = this.getField(label);
      if (field.props.onInputChange) field.props.onInputChange(value);
      else {
        const input = field.props.children;
        const target = { value };
        const event = { target, currentTarget: target };
        input.props.onChange(event);
        target.value = input.props.value;
        event.currentTarget = null;
      }
      updates.splice(0).forEach((update) => update());
      tree = render();
    },
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
  assert.equal((await mutate("/sites/999999", "PUT", formUtils.buildSitePayloadForSubmit(site))).status, 404);

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

it("submits every text and select field with the latest value and includes pending chips", async () => {
  let submitted;
  const editor = mountEditor(site, async (payload) => { submitted = payload; return true; });
  const fields = [
    ["名称", "name", "New site"], ["Slug", "slug", "new-site"], ["URL", "url", "https://new.example.com"],
    ["Monitor Key", "monitorKey", "new-monitor"], ["排序", "sortOrder", "42", 42],
    ["分类", "category", "tool"], ["描述", "description", "Updated description"],
    ["作品简介", "summary", "New summary"], ["源码链接", "repoUrl", "https://github.com/example/new"],
    ["备用访问链接", "fallbackUrl", "https://fallback.example.com"],
    ["封面图片链接", "coverUrl", "https://images.example.com/new.webp"], ["展示模式", "coverMode", "gallery"],
  ];
  for (const [label, , value] of fields) editor.changeField(label, value);
  editor.changeField("技术栈", "React");
  editor.changeField("标签", "作品集");
  await editor.submit();
  for (const [, key, value, expected] of fields) assert.equal(submitted[key], expected ?? value, key);
  assert.deepEqual(submitted.techStack, ["React"]);
  assert.deepEqual(submitted.tags, ["作品集"]);
  const reopened = mountEditor({ ...site, ...submitted }, async () => true);
  assert.equal(reopened.getField("封面图片链接").props.children.props.value, submitted.coverUrl);
});

it("detects old Workers, lost fields and missing records instead of reporting success", () => {
  const payload = formUtils.buildSitePayloadForSubmit(site);
  const saved = { ...site, ...payload };
  assert.equal(verifySavedSite([saved], payload, site.id), saved);
  const { coverUrl: omitted, ...oldRecord } = saved;
  assert.equal(omitted, null);
  assert.throws(() => verifySavedSite([oldRecord], payload), /Worker/);
  assert.throws(() => verifySavedSite([{ ...saved, summary: "lost edit" }], payload), /不一致/);
  assert.throws(() => verifySavedSite([], payload, site.id), /未读取/);
});

it("submits architecture edits, reopens the saved details and explicitly clears them", async () => {
  let submitted;
  const editor = mountEditor(site, async (payload) => { submitted = payload; return true; });
  editor.changeArchitecture({ ...emptyArchitecture(), frontend: "  React 前端  ", nodes: [{ id: "frontend", label: "网站", kind: "frontend", technology: "React", description: "界面" }] });
  await editor.submit();
  assert.equal(submitted.architecture.frontend, "React 前端");
  const reopened = mountEditor({ ...site, ...submitted }, async (payload) => { submitted = payload; return true; });
  assert.equal(reopened.getArchitecture().nodes[0].technology, "React");
  reopened.changeArchitecture(emptyArchitecture());
  await reopened.submit();
  assert.equal(submitted.architecture, null);
});

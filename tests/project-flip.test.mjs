import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { emptyArchitecture } from "../shared/site-architecture.ts";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/_components/portfolio-project.tsx", import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function find(node, predicate) {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node?.props) return undefined;
  return predicate(node) ? node : find(node.props.children, predicate);
}
function mount(architecture) {
  const states = []; let index = 0;
  const exports = {};
  runInNewContext(source, { exports, requestAnimationFrame: (callback) => callback(), require(id) {
    if (id === "react") return {
      useState(initial) { const at = index++; if (!(at in states)) states[at] = initial; return [states[at], (value) => { states[at] = typeof value === "function" ? value(states[at]) : value; }]; },
      useRef: () => ({ current: null }), useEffect() {}, useCallback: (callback) => callback,
    };
    if (id.endsWith("project-preview")) return { ProjectPreview: "preview" };
    if (id.endsWith("use-page-visibility")) return { usePageVisibility: () => true };
    if (id.endsWith("tech-stack-label")) return { TechStackLabel: "tech-label" };
    if (id.endsWith("architecture-details")) return { ArchitectureDetails: "architecture-details" };
    return require(id);
  } });
  return () => {
    index = 0;
    return exports.PortfolioProject({ site: {
      id: 1, name: "Demo", slug: "demo", url: "https://example.com", description: "demo", summary: "", tags: [], techStack: [],
      allowInteraction: true, architecture, status: { hasMonitorKey: false, isOnline: null },
    } });
  };
}

it("turns off the live preview on the back, makes only the visible face interactive, and restores the front with Escape", () => {
  const render = mount({ ...emptyArchitecture(), overview: "How it works" });
  let tree = render();
  find(tree, (node) => node.type === "button" && node.props["aria-pressed"] !== undefined).props.onClick();
  tree = render();
  assert.equal(find(tree, (node) => node.type === "preview").props.active, true);
  find(tree, (node) => node.type === "button" && node.props["aria-expanded"] !== undefined).props.onClick();
  tree = render();
  assert.equal(tree.props["data-flipped"], true);
  assert.equal(find(tree, (node) => node.props.className === "project-flip__front").props.inert, true);
  assert.equal(find(tree, (node) => node.props.className === "project-flip__back").props.inert, false);
  assert.equal(find(tree, (node) => node.type === "preview").props.active, false);
  assert.equal(find(tree, (node) => node.type === "preview").props.interactionEnabled, false);
  let stopped = false;
  tree.props.onKeyDown({ key: "Escape", stopPropagation() { stopped = true; } });
  tree = render();
  assert.equal(stopped, true);
  assert.equal(tree.props["data-flipped"], false);
  assert.equal(find(tree, (node) => node.props.className === "project-flip__back").props.inert, true);
  assert.equal(find(tree, (node) => node.type === "architecture-details"), undefined);
});

it("does not invent architecture details for sites without architecture content", () => {
  const tree = mount(null)();
  assert.equal(find(tree, (node) => node.props.className === "project-flip__back"), undefined);
  assert.equal(find(tree, (node) => node.props["aria-expanded"] !== undefined), undefined);
});

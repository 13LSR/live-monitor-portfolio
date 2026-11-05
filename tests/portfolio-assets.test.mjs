import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "app");

describe("immersive portfolio UI", () => {
  it("loads the attributed lightweight character model with a usable fallback", () => {
    const scene = readFileSync(join(app, "_lib", "scene", "scene-runtime.ts"), "utf8");
    const model = join(root, "public", "models", "minion-a01.glb");
    const attribution = readFileSync(join(root, "public", "models", "ATTRIBUTION.md"), "utf8");

    assert.equal(existsSync(model), true);
    assert.equal(readFileSync(model).subarray(0, 4).toString(), "glTF");
    assert.match(scene, /new GLTFLoader\(\)\.load/);
    assert.match(scene, /new THREE\.AnimationMixer/);
    assert.match(scene, /CapsuleGeometry/);
    assert.match(scene, /if \(!disposed\) host\.dataset\.modelState = "fallback"/);
    assert.match(attribution, /CC0 1\.0/);
    assert.match(attribution, /gobkit\.com\/freebies/);
  });

  it("provides a three-section public nav without changing the admin route", () => {
    const nav = readFileSync(join(app, "_components", "site-nav.tsx"), "utf8");
    const home = readFileSync(join(app, "_components", "home-page.tsx"), "utf8");
    const works = readFileSync(join(app, "_components", "portfolio-grid-client.tsx"), "utf8");
    const about = readFileSync(join(app, "about", "page.tsx"), "utf8");
    const admin = readFileSync(join(app, "admin", "page.tsx"), "utf8");

    for (const route of ['href: "/"', 'href: "/works"', 'href: "/about"']) assert.ok(nav.includes(route));
    assert.match(home, /<SiteNav \/>/);
    assert.match(readFileSync(join(app, "_components", "portfolio-shell.tsx"), "utf8"), /<ImmersiveScene view=\{view\} \/>/);
    assert.match(works, /<SiteNav \/>/);
    assert.match(about, /<SiteNav \/>/);
    assert.match(about, /你好，我是小茄/);
    assert.match(admin, /<AdminDashboard \/>/);
  });

  it("supports keyboard movement, jumping, touch controls, and bounded scene rendering", () => {
    const component = readFileSync(join(app, "_components", "immersive-scene.tsx"), "utf8");
    const scene = readFileSync(join(app, "_lib", "scene", "scene-runtime.ts"), "utf8");
    const css = readFileSync(join(app, "_styles", "immersive.css"), "utf8");

    for (const value of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '"space"']) {
      assert.ok(scene.includes(value), value);
    }
    assert.match(component, /data-control="space"/);
    assert.match(scene, /THREE\.MathUtils\.clamp\(nextX, -CITY_LIMIT, CITY_LIMIT\)/);
    assert.match(scene, /setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, compact \? 1\.25 : 1\.5\)\)/);
    assert.match(scene, /window\.cancelAnimationFrame\(frame\)/);
    assert.match(scene, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/);
    assert.match(scene, /renderer\.dispose\(\)/);
    assert.match(css, /\.immersive-scene__controls\s*\{ position: absolute/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });

  it("shows one live work per horizontal page and preserves monitor-backed cards", () => {
    const showcase = readFileSync(join(app, "_components", "portfolio-showcase.tsx"), "utf8");
    const project = readFileSync(join(app, "_components", "portfolio-project.tsx"), "utf8");
    const preview = readFileSync(join(app, "_components", "project-preview.tsx"), "utf8");
    const css = readFileSync(join(app, "_styles", "gallery.css"), "utf8");

    assert.match(showcase, /\[\.\.\.sites\]\.sort/);
    assert.match(showcase, /<PortfolioProject site=\{orderedSites\[activeIndex\]\} featured \/>/);
    assert.match(showcase, /goTo\(activeIndex \+ 1\)/);
    assert.match(showcase, /goTo\(activeIndex - 1\)/);
    assert.match(showcase, /onTouchStart/);
    assert.match(showcase, /onTouchEnd/);
    assert.match(showcase, /aria-current=\{dotIndex === activeIndex \? "step"/);
    assert.match(showcase, /<PublicGoodNotice \/>/);
    assert.match(project, /site\.status\.isOnline/);
    assert.match(project, /<ProjectPreview/);
    assert.match(preview, /previewLoadQueue\.request/);
    assert.match(preview, /loading="lazy"/);
    assert.match(css, /\.works-page-card \.portfolio-project__preview\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  });

  it("keeps the old directional design doc out of the active route and documents static assets", () => {
    const oldDoc = join(root, "docs", "superpowers", "specs", "2026-07-10-warm-digital-garden-portfolio-design.md");
    const layout = readFileSync(join(app, "layout.tsx"), "utf8");
    const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");

    assert.equal(existsSync(oldDoc), false);
    assert.match(layout, /lang="zh-CN"/);
    assert.match(nextConfig, /output:\s*"export"/);
    assert.match(nextConfig, /unoptimized:\s*true/);
  });
});

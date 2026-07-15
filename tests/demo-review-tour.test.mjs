import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appDir = join(process.cwd(), "app");

describe("demo review tour", () => {
  it("has a hero, route, architecture sections and skip link", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.match(demoPage, /<section\s+className="demo-hero"/);
    assert.match(demoPage, /<h1\s+id="demo-title"/);
    assert.match(demoPage, /<section\s+className="demo-section"/);
    assert.match(demoPage, /<section\s+className="demo-section"/);
    assert.match(demoPage, /推荐体验顺序/);
    assert.match(demoPage, /技术架构/);
    assert.match(demoPage, /<a\s+href="#demo-title"\s+className="demo-skip-link"/);
    assert.match(demoPage, /aria-label="跳转到主要内容"/);
  });

  it("links CTA to the featured work anchor", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");

    assert.match(demoPage, /href="\/#featured-work"/);
    assert.match(demoPage, /开始体验作品/);
    assert.match(homePage, /id="featured-work"/);
  });

  it("provides clear navigation back to home", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.match(demoPage, /<nav\s+className="demo-nav"/);
    assert.match(demoPage, /href="\/"\s+className="demo-nav__back"/);
    assert.match(demoPage, /返回首页/);
    assert.match(demoPage, /<nav\s+className="demo-back"/);
    assert.match(demoPage, /返回首页作品集/);
  });

  it("footer contains a restrained review tour entry", () => {
    const footer = readFileSync(join(appDir, "_components", "portfolio-footer.tsx"), "utf8");

    assert.match(footer, /<Link\s+href="\/demo"/);
    assert.match(footer, /评审导览/);
  });

  it("does not mention 'Bento' or 'Bento 网格'", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.doesNotMatch(demoPage, /Bento/i);
  });

  it("does not mention '姬长信' API by name", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.doesNotMatch(demoPage, /姬长信/);
  });

  it("does not hardcode specific site names or URLs", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.doesNotMatch(demoPage, /格罗克/);
    assert.doesNotMatch(demoPage, /pws\.331106\.xyz/);
    assert.doesNotMatch(demoPage, /api\.isoyu\.com/);
  });

  it("does not mention '1920×1080' resolution loading", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.doesNotMatch(demoPage, /1920/);
    assert.doesNotMatch(demoPage, /1080/);
  });

  it("describes public good as '公开公益数据接口' with truthful behavior", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.match(demoPage, /公开公益数据接口/);
    assert.match(demoPage, /仅展示真实接口返回或历史真实缓存/);
    assert.match(demoPage, /没有真实内容时自动隐藏/);
  });

  it("describes status with text labels, not only color", () => {
    const demoPage = readFileSync(join(appDir, "demo", "page.tsx"), "utf8");

    assert.match(demoPage, /运行中/);
    assert.match(demoPage, /已离线/);
  });

  it("supports prefers-reduced-motion for demo page transitions", () => {
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*demo-nav__back[\s\S]*transition:\s*none/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*demo-hero__cta[\s\S]*transition:\s*none/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*demo-back__link[\s\S]*transition:\s*none/);
  });
});
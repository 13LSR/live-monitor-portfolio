import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "portfolio");
const appDir = join(process.cwd(), "app");
const assets = [
  ["home-bg.webp", "8ec4d9cb1d20559b86fb99c2a8fb827203d3a18de30d78672c76e7bba172b318"],
  ["animal-icon.png", "bba1a5b122bcc690af526b3725f3a8306197b3375fcaa917db3775f6b7628ac0"],
  ["cursor-icon.png", "2ccf318458b70a9314e3f40683cfd15cfe7adb6a329c5a65e6b720f713f78e98"],
];

describe("portfolio assets", () => {
  it("publishes approved files unchanged", () => {
    for (const [file, hash] of assets) {
      const path = join(dir, file);
      assert.equal(existsSync(path), true, file);
      const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
      assert.equal(actual, hash);
    }
  });

  it("documents source and license", () => {
    const path = join(dir, "ATTRIBUTION.md");
    assert.equal(existsSync(path), true);
    const text = readFileSync(path, "utf8");
    for (const value of ["Animal Island UI", "CC-BY-NC-4.0", "home_bg.webp", "animal_icon.png", "cursor-icon.png"]) {
      assert.match(text, new RegExp(value.replace(".", "\\.")));
    }
  });

  it("scopes the force cursor to the public page and fine pointers", () => {
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");
    const adminPage = readFileSync(join(appDir, "admin", "page.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(homePage, /portfolio-cursor--force/);
    assert.doesNotMatch(adminPage, /portfolio-cursor--force/);
    assert.match(css, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);
    assert.match(css, /\.portfolio-cursor--force[\s\S]*\.portfolio-cursor--force \*[\s\S]*cursor:\s*url\("\/portfolio\/cursor-icon\.png"\) 4 0,\s*auto\s*!important/);
    assert.match(css, /@media\s*\(pointer:\s*coarse\)[\s\S]*cursor:\s*auto\s*!important/);
  });

  it("renders the approved immersive hero without dashboard content", () => {
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");
    const hero = readFileSync(join(appDir, "_components", "portfolio-hero.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(homePage, /<PortfolioHero\s*\/>/);
    assert.match(hero, /小茄的网站作品集/);
    assert.match(hero, /收录站长正在运行的网站作品，也记录每一次认真完成的创作。/);
    assert.match(hero, /\/portfolio\/animal-icon\.png/);
    assert.match(hero, /alt="小茄的网站作品集双角色插画"/);
    assert.doesNotMatch(hero, /portfolio-hero__art[\s\S]{0,160}aria-hidden="true"/);
    assert.match(hero, /向下看看/);
    assert.match(hero, /window\.scrollY\s*>\s*70/);
    assert.match(hero, /portfolio-hero__copy portfolio-hero__enter/);
    assert.match(hero, /portfolio-hero__art portfolio-hero__enter/);
    assert.doesNotMatch(hero, /作品小岛|网站小岛|岛上公告|PublicGood|PortfolioGrid|StatusPill|CTA/i);
    assert.match(css, /\.portfolio-hero\s*\{[\s\S]*min-height:\s*clamp\(34rem,\s*76svh,\s*46rem\)/);
    assert.match(css, /background-image:[\s\S]*url\("\/portfolio\/home-bg\.webp"\)/);
    assert.match(css, /\.portfolio-cursor--force\s*\{[\s\S]*--portfolio-hero-green:[\s\S]*--portfolio-content-warm:[\s\S]*--portfolio-deep-ink:[\s\S]*--portfolio-muted-green:[\s\S]*--portfolio-butter:[\s\S]*--portfolio-coral:/);
    assert.match(css, /\.portfolio-cursor--force\s*\{[\s\S]*font-family:[^;]*(Microsoft YaHei UI|PingFang SC|Noto Sans SC)/);
    assert.doesNotMatch(css, /\.portfolio-cursor--force\s*\{[\s\S]*font-family:[^;]*(Aptos Display|Trebuchet MS|Gill Sans)/);
    assert.match(css, /\.portfolio-project__identity h2\s*\{[\s\S]*color:\s*var\(--portfolio-deep-ink\)/);
    assert.match(css, /\.portfolio-project__summary\s*\{[\s\S]*color:\s*var\(--portfolio-muted-green\)/);
    assert.match(css, /\.portfolio-project__eyebrow\s*\{[\s\S]*color:\s*var\(--portfolio-butter\)/);
    assert.match(css, /\.portfolio-project__status\.is-offline \.portfolio-project__status-dot\s*\{[\s\S]*background:\s*var\(--portfolio-coral\)/);
    assert.match(css, /\.portfolio-scroll-hint\.is-hidden[\s\S]*pointer-events:\s*none/);
    assert.match(css, /@keyframes\s+portfolio-scroll-hint/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("uses a featured-first live-card showcase with an ordinary project grid", () => {
    const client = readFileSync(join(appDir, "_components", "portfolio-grid-client.tsx"), "utf8");
    const showcase = readFileSync(join(appDir, "_components", "portfolio-showcase.tsx"), "utf8");
    const project = readFileSync(join(appDir, "_components", "portfolio-project.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(client, /<PortfolioShowcase\s+sites=\{sites\}\s*\/>/);
    assert.doesNotMatch(client, /BentoGrid|createCollectionSummary|filterSitesByCategory|portfolioCategoryFilters/);
    assert.match(showcase, /splitFeaturedSites\(sites\)/);
    assert.match(showcase, /featured/);
    assert.match(showcase, /portfolio-ordinary-grid/);
    assert.match(showcase, /暂时还没有公开展示的网站/);
    assert.doesNotMatch(project, /StatusPill|animal-island-ui|<Tag/);
    assert.match(project, /portfolio-project__traffic-lights/);
    assert.match(project, /portfolio-project__status-pulse/);
    assert.match(project, /visibleTags/);
    assert.match(project, /visibleTechStack/);
    assert.match(project, /site\.repoUrl/);
    assert.match(project, /<iframe/);
    assert.match(project, /title=\{site\.name\}/);
    assert.match(project, /site\.fallbackUrl\s*\?\?\s*site\.url/);
    assert.match(project, /<a[\s\S]*href=\{visitUrl\}[\s\S]*target="_blank"[\s\S]*rel="noreferrer"[\s\S]*打开网站/);
    assert.doesNotMatch(project, /window\.open\(/);
    assert.match(css, /\.portfolio-project__preview[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
    assert.match(css, /\.portfolio-project__chrome\s*\{[\s\S]*background:\s*#f3d677/);
    assert.match(css, /\.portfolio-project\s*\{[\s\S]*box-shadow:\s*8px\s+8px\s+0/);
    assert.match(project, /打开网站/);
    assert.match(css, /\.portfolio-ordinary-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(css, /\.portfolio-ordinary-grid > \.portfolio-project:last-child:nth-child\(odd\)[\s\S]*grid-column:\s*1\s*\/\s*-1[\s\S]*justify-self:\s*center/);
    assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*\.portfolio-ordinary-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*\.portfolio-ordinary-grid > \.portfolio-project:last-child:nth-child\(odd\)[\s\S]*width:\s*100%[\s\S]*grid-column:\s*auto/);
  });

  it("places a truthful direct public-good portrait strip after featured work", () => {
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");
    const showcase = readFileSync(join(appDir, "_components", "portfolio-showcase.tsx"), "utf8");
    const notice = readFileSync(join(appDir, "_components", "public-good-notice.tsx"), "utf8");
    const publicGoodView = readFileSync(join(appDir, "_lib", "public-good-view.ts"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.doesNotMatch(homePage, /<PublicGoodNotice/);
    assert.match(showcase, /<PublicGoodNotice\s*\/>/);
    assert.match(showcase, /<PortfolioProject site=\{featuredSite\} featured\s*\/>[\s\S]*<PublicGoodNotice\s*\/>[\s\S]*ordinarySites\.map/);
    assert.match(notice, /refreshPublicGoodDirect/);
    assert.doesNotMatch(notice, /getPublicGood|FallbackBatch|local-fallback|isFallback/);
    assert.match(notice, /createPublicGoodView\(result, selectedId\)/);
    assert.match(notice, /if\s*\(!view\)\s*return null/);
    assert.match(notice, /愿更多人被看见/);
    assert.match(publicGoodView, /\.slice\(0,\s*5\)/);
    assert.match(notice, /onMouseEnter|onFocus/);
    assert.match(notice, /selectedPerson\.lostTime/);
    assert.match(notice, /selectedPerson\.lostPlace/);
    assert.match(notice, /selectedPerson\.childFeature/);
    assert.match(notice, /selectedPerson\.lostTime\s*\|\|\s*"暂未提供"/);
    assert.match(notice, /selectedPerson\.lostPlace\s*\|\|\s*"暂未提供"/);
    assert.match(notice, /selectedPerson\.childFeature\s*\|\|\s*"暂未提供"/);
    assert.match(notice, /selectedPerson\.detailUrl/);
    assert.match(notice, /onError=\{\(\)\s*=>\s*setFailed\(true\)\}/);
    assert.doesNotMatch(notice, /信息来自公开公益接口|历史真实缓存|public-good__source/);
    assert.match(css, /\.public-good-portraits[\s\S]*overflow-x:\s*auto/);
    assert.match(css, /\.public-good\s*\{[\s\S]*border:\s*1px[\s\S]*border-radius:\s*10px[\s\S]*background:\s*rgba\(255,\s*253,\s*247,\s*0\.78\)/);
    assert.match(css, /\.public-good__heading\s*\{[\s\S]*flex-direction:\s*column[\s\S]*align-items:\s*flex-start/);
    assert.match(css, /\.public-good__detail\s*\{[\s\S]*background:\s*#fffaf0/);
  });

  it("finishes with a restrained footer on a warm flat content band", () => {
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");
    const footer = readFileSync(join(appDir, "_components", "portfolio-footer.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(homePage, /<PortfolioGridClient\s*\/>[\s\S]*<PortfolioFooter\s*\/>/);
    assert.match(footer, /<footer/);
    assert.doesNotMatch(footer, /统计|监控|Bento|小岛|公告/);
    assert.match(css, /\.portfolio-content-surface\s*\{[\s\S]*background:\s*var\(--portfolio-content-warm\)/);
    const project = readFileSync(join(appDir, "_components", "portfolio-project.tsx"), "utf8");
    assert.match(project, /useRef<HTMLElement>/);
    assert.match(project, /new IntersectionObserver/);
    assert.match(project, /observer\.unobserve\(node\)/);
    assert.match(project, /window\.requestAnimationFrame\(\(\)\s*=>\s*setIsVisible\(true\)\)/);
    assert.match(project, /window\.cancelAnimationFrame\(frame\)/);
    assert.match(project, /portfolio-project\$\{isVisible\s*\?\s*" is-visible"\s*:\s*""\}/);
    assert.match(css, /\.portfolio-hero__enter\s*\{[\s\S]*animation:\s*portfolio-hero-enter/);
    assert.match(css, /\.portfolio-project\s*\{[\s\S]*opacity:\s*0[\s\S]*transform:\s*translateY\(8px\)/);
    assert.match(css, /\.portfolio-project\.is-visible\s*\{[\s\S]*opacity:\s*1[\s\S]*transform:\s*translateY\(0\)/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.portfolio-hero__enter[\s\S]*animation:\s*none[\s\S]*\.portfolio-project[\s\S]*opacity:\s*1[\s\S]*transform:\s*none/);
    assert.doesNotMatch(css, /font-size:\s*clamp\([^;]*(vw|vh)/);
  });

  it("keeps public metadata, focus, status, and async failure semantics truthful", () => {
    const layout = readFileSync(join(appDir, "layout.tsx"), "utf8");
    const notice = readFileSync(join(appDir, "_components", "public-good-notice.tsx"), "utf8");
    const project = readFileSync(join(appDir, "_components", "portfolio-project.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(layout, /title:\s*"小茄的网站作品集"/);
    assert.match(notice, /\.catch\(\(\)\s*=>\s*\{[\s\S]*setResult\(null\)/);
    assert.match(project, /portfolio-project__status-dot/);
    assert.doesNotMatch(css, /\.portfolio-project__status span[\s\S]*background:\s*#7ca48d/);
    assert.match(css, /\.portfolio-scroll-hint:focus-visible[\s\S]*outline:/);
  });

  it("removes obsolete public Bento and fake frontend fallback implementations", () => {
    const apiClient = readFileSync(join(appDir, "_lib", "api-client.ts"), "utf8");

    for (const file of ["bento-grid.tsx", "live-project-card.tsx", "status-pill.tsx"]) {
      assert.equal(existsSync(join(appDir, "_components", file)), false, file);
    }
    assert.doesNotMatch(apiClient, /PublicGoodBatch|getPublicGood|getPublicGoodFallbackBatch|local-fallback/);
  });

  it("keeps the public warm content band separate from the admin surface", () => {
    const homePage = readFileSync(join(appDir, "_components", "home-page.tsx"), "utf8");
    const adminPage = readFileSync(join(appDir, "admin", "page.tsx"), "utf8");
    const css = readFileSync(join(appDir, "globals.css"), "utf8");

    assert.match(homePage, /portfolio-content-surface/);
    assert.doesNotMatch(homePage, /className="portfolio-surface/);
    assert.match(adminPage, /className="portfolio-surface/);
    assert.doesNotMatch(adminPage, /portfolio-content-surface/);
    assert.match(css, /\.portfolio-content-surface\s*\{[\s\S]*background:\s*var\(--portfolio-content-warm\)/);
    assert.match(css, /\.portfolio-surface\s*\{[\s\S]*background-size:\s*28px 28px/);
  });

  it("configures next/image for static export", () => {
    const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    assert.match(nextConfig, /output:\s*"export"/);
    assert.match(nextConfig, /images:\s*\{[\s\S]*unoptimized:\s*true/);
  });
});

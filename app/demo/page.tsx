import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
  title: "评审导览",
  description:
    "60秒快速了解活体网站作品集的核心创新、推荐体验顺序和技术架构。",
};

export default function DemoPage() {
  return (
    <main className="portfolio-cursor--force demo-page">
      <a
        href="#demo-title"
        className="demo-skip-link"
        aria-label="跳转到主要内容"
      >
        跳过导航
      </a>
      <nav className="demo-nav" aria-label="导览导航">
        <Link href="/" className="demo-nav__back">
          <span aria-hidden="true">←</span>
          返回首页
        </Link>
      </nav>
      <section className="demo-hero" aria-labelledby="demo-title">
        <div className="demo-hero__inner">
          <p className="demo-hero__eyebrow">评审导览</p>
          <h1 id="demo-title">活体网站作品集</h1>
          <p className="demo-hero__subtitle">
            直接嵌入真实运行的网站，不是截图。用实时 iframe 渲染与 UptimeFlare 监控，
            让每个部署的网站都以&quot;活体&quot;形式运行在作品集中。
          </p>
          <Link href="/works" className="demo-hero__cta">
            开始体验作品
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section
        className="demo-section"
        aria-labelledby="demo-route-title"
      >
        <h2 id="demo-route-title">推荐体验顺序</h2>
        <ol className="demo-route">
          <li className="demo-route__step">
            <span className="demo-route__number" aria-hidden="true">1</span>
            <div>
              <h3>精选真实网站</h3>
              <p>
                从首页图片环进入作品展厅，当前作品嵌入真实运行网站的实时页面，不是截图。
                通过 iframe 渲染，保持原始交互能力。
              </p>
            </div>
          </li>
          <li className="demo-route__step">
            <span className="demo-route__number" aria-hidden="true">2</span>
            <div>
              <h3>在线状态实时监控</h3>
              <p>
                卡片右上角状态栏实时同步 UptimeFlare 监控数据。
                在线时显示&quot;运行中&quot;文字与绿色指示灯及真实延迟（ms），
                离线时显示&quot;已离线&quot;文字与暗色遮罩。数据每 60 秒自动刷新。
              </p>
            </div>
          </li>
          <li className="demo-route__step">
            <span className="demo-route__number" aria-hidden="true">3</span>
            <div>
              <h3>公益关注</h3>
              <p>
                作品页底部可展开公益关注，数据来自公开公益数据接口，
                浏览器端实时拉取并本地缓存 6 小时。仅展示真实接口返回或历史真实缓存，
                没有真实内容时自动隐藏。
              </p>
            </div>
          </li>
          <li className="demo-route__step">
            <span className="demo-route__number" aria-hidden="true">4</span>
            <div>
              <h3>更多网站作品</h3>
              <p>
                通过滚轮、方向键或滑动逐页查看更多在线作品，每张卡片同样具备
                实时渲染与状态监控，可在管理后台动态增减。
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section
        className="demo-section"
        aria-labelledby="demo-arch-title"
      >
        <h2 id="demo-arch-title">技术架构</h2>
        <div className="demo-arch">
          <div className="demo-arch__layer">
            <span className="demo-arch__label">前端</span>
            <p>Next.js 16 静态导出，部署于 Cloudflare Pages</p>
          </div>
          <span className="demo-arch__arrow" aria-hidden="true">↓</span>
          <div className="demo-arch__layer">
            <span className="demo-arch__label">后端 API</span>
            <p>Cloudflare Worker + D1，提供站点 CRUD 与管理鉴权</p>
          </div>
          <span className="demo-arch__arrow" aria-hidden="true">↓</span>
          <div className="demo-arch__layer">
            <span className="demo-arch__label">监控层</span>
            <p>UptimeFlare 定时探活，前端每 60 秒轮询状态与延迟</p>
          </div>
        </div>
      </section>

      <nav className="demo-back" aria-label="返回导航">
        <Link href="/" className="demo-back__link">
          <span aria-hidden="true">←</span>
          返回首页作品集
        </Link>
      </nav>
    </main>
  );
}

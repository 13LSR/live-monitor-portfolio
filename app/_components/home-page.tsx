import { PortfolioGridClient } from "@/app/_components/portfolio-grid-client";
import { PublicGoodNotice } from "@/app/_components/public-good-notice";

export function HomePage() {
  return (
    <main className="portfolio-surface min-h-screen px-4 py-8 text-[var(--ink)] md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="island-hero mb-10 grid gap-8 rounded-[2rem] border border-[var(--line)] bg-[#fff7df] p-5 shadow-[0_18px_0_rgba(31,37,35,0.14)] md:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-5 font-mono text-xs uppercase text-[var(--muted)]">
              作品小岛
            </p>
            <h1
              suppressHydrationWarning
              className="max-w-3xl text-5xl font-semibold leading-none text-[var(--ink)] md:text-7xl"
            >
              小茄的网站小岛
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
              这里收录正在运行的网站作品。每张卡片都不是截图，而是一扇通向真实页面的小窗。
            </p>
          </div>
          <div
            aria-label="小岛状态说明"
            className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--paper-raised)] p-4 shadow-[6px_6px_0_rgba(31,37,35,0.18)]"
          >
            <p className="font-mono text-xs uppercase text-[var(--muted)]">
              岛上公告
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]">
              部分网站会显示在线状态与访问延迟。若某个页面暂时不可访问，卡片会保留入口并标记当前状态。
            </p>
          </div>
        </header>
        <PublicGoodNotice />
        <PortfolioGridClient />
      </div>
    </main>
  );
}

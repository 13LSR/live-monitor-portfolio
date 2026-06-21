import { PortfolioGridClient } from "@/app/_components/portfolio-grid-client";

export function HomePage() {
  return (
    <main className="portfolio-surface min-h-screen px-4 py-8 text-[var(--ink)] md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 grid gap-8 border-b border-[var(--line)] pb-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-5 font-mono text-xs uppercase text-[var(--muted)]">
              Online website collection
            </p>
            <h1
              suppressHydrationWarning
              className="max-w-3xl text-5xl font-semibold leading-none text-[var(--ink)] md:text-7xl"
            >
              小茄的网站集合
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
              这里收录我部署在云平台上的网站作品。每张卡片都不是截图，而是正在运行的真实页面。
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[var(--paper-raised)] p-4 shadow-[8px_8px_0_var(--ink)]">
            <p className="font-mono text-xs uppercase text-[var(--muted)]">
              Collection note
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]">
              部分网站会显示在线状态与访问延迟。若某个页面暂时不可访问，卡片会保留入口并标记当前状态。
            </p>
          </div>
        </header>
        <PortfolioGridClient />
      </div>
    </main>
  );
}

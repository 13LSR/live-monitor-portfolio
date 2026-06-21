import { PortfolioGridClient } from "@/app/_components/portfolio-grid-client";

export function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] px-4 py-10 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-md md:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
              在线作品集
            </span>
          </div>
          <h1
            suppressHydrationWarning
            className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl"
          >
            小茄的网站集合
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            这里收录我部署在云平台上的网站。每个卡片都展示真实运行中的页面，并标记当前访问状态。
          </p>
        </header>
        <PortfolioGridClient />
      </div>
    </main>
  );
}

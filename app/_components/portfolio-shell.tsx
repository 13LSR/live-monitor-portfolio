"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { PortfolioDataProvider } from "@/app/_components/portfolio-data";
import type { SceneView } from "@/app/_lib/scene/camera-flight";

const ImmersiveScene = dynamic(() => import("@/app/_components/immersive-scene").then((module) => module.ImmersiveScene), { ssr: false });

export function PortfolioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const view: SceneView | null = pathname === "/" ? "home"
    : pathname === "/works" ? "works" : pathname === "/about" ? "about" : null;
  if (!view) return children;

  return <PortfolioDataProvider>
    <div className={`portfolio-world public-page view-${view}`}>
      <ImmersiveScene view={view} />
      <div className="portfolio-route">{children}</div>
    </div>
  </PortfolioDataProvider>;
}

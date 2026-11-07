import { PortfolioGridClient } from "@/app/_components/portfolio-grid-client";
import { pageMetadata } from "@/app/_lib/page-metadata";

export const metadata = pageMetadata("网站作品与实现架构", "逐页浏览小茄正在运行的网站作品，体验实时预览，翻转卡片了解前后端技术栈、组件关系和实现细节。", "/works");

export default function WorksPage() {
  return <PortfolioGridClient />;
}

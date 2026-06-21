import type { SiteRecord } from "@/shared/types";

const now = "2026-06-20T00:00:00.000Z";

export const demoSites: SiteRecord[] = [
  {
    id: 1,
    name: "网易云音乐 Demo",
    slug: "wyy-331106-xyz",
    url: "https://wyy.331106.xyz",
    monitorKey: "wyy.331106.xyz",
    category: "web",
    description: "已部署在线站点，作为活体 iframe 监控卡片的首个演示目标。",
    coverMode: "iframe",
    sortOrder: 10,
    isVisible: true,
    allowInteraction: false,
    createdAt: now,
    updatedAt: now,
  },
];

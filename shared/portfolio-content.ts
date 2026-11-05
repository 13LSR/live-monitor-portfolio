import type { SitePayload } from "./contracts";

const defaults = {
  category: "web",
  techStack: [],
  repoUrl: null,
  fallbackUrl: null,
  coverUrl: null,
  coverMode: "iframe",
  isVisible: true,
  allowInteraction: false,
} as const;

// Descriptions use the existing sites' visible features. Unverified technical
// details and repository links remain empty and can be filled in by the owner.
export const portfolioContent: SitePayload[] = [
  {
    ...defaults,
    techStack: [],
    name: "格罗克公益站",
    slug: "pws.331106.xyz",
    url: "https://pws.331106.xyz",
    monitorKey: "pws.331106.xyz",
    description: "在同一个入口体验 AI 生图、对话与搜索，并浏览可复用的提示词。",
    summary: "把 AI 生图、对话与搜索放在同一个入口。",
    tags: ["AI 生图", "智能对话", "搜索"],
    isFeatured: true,
    sortOrder: 0,
  },
  {
    ...defaults,
    techStack: [],
    name: "哈基米公益站",
    slug: "hjm.331106.xyz",
    url: "https://hjm.331106.xyz",
    monitorKey: "hjm.331106.xyz",
    description: "提供在线 AI 对话入口，用于日常问答和内容交流。",
    summary: "一个轻量的在线 AI 对话入口。",
    tags: ["AI 对话", "在线工具"],
    isFeatured: false,
    sortOrder: 1,
  },
  {
    ...defaults,
    techStack: [],
    name: "音乐解析",
    slug: "wyy-331106-xyz",
    url: "https://wyy.331106.xyz",
    monitorKey: "wyy.331106.xyz",
    description: "提供在线音乐解析入口。",
    summary: "一个专注于音乐解析的在线工具。",
    tags: ["音乐", "在线工具"],
    isFeatured: false,
    sortOrder: 2,
  },
];

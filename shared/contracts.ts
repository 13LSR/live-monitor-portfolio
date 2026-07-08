import type { SiteRecord } from "./types";

export interface PublicSitesResponse {
  sites: SiteRecord[];
}

export interface PublicGoodPerson {
  id: string;
  name: string;
  sex: string;
  birthTime: string;
  lostTime: string;
  childPic: string | null;
  lostPlace: string;
  childFeature: string;
  detailUrl: string | null;
}

export interface PublicGoodContacts {
  consultMail: string;
  tel: string;
}

export interface PublicGoodBatch {
  success: boolean;
  items: PublicGoodPerson[];
  contacts: PublicGoodContacts | null;
  sourceName: string;
  sourceApi: string;
  cachedAt: string;
  cacheTtlSeconds: number;
  isFallback: boolean;
  message?: string;
}

export interface SitePayload {
  name: string;
  slug: string;
  url: string;
  monitorKey: string | null;
  category: "web" | "landing" | "tool" | "other";
  description: string;
  summary: string;
  tags: string[];
  techStack: string[];
  isFeatured: boolean;
  repoUrl: string | null;
  fallbackUrl: string | null;
  coverMode: "iframe" | "text" | "gallery";
  sortOrder: number;
  isVisible: boolean;
  allowInteraction: boolean;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  ok: true;
}

export interface AuthStateResponse {
  authenticated: boolean;
}

export interface MutationResponse {
  ok: true;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

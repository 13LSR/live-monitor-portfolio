import type { SiteRecord } from "./types";

export interface PublicSitesResponse {
  sites: SiteRecord[];
}

export interface SitePayload {
  name: string;
  slug: string;
  url: string;
  monitorKey: string | null;
  category: "web" | "landing" | "tool" | "other";
  description: string;
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

import type { SitePayload } from "../../shared/contracts";
import type { SiteRecord } from "../../shared/types";
import { isCoverUrl } from "../../shared/site-cover.ts";
import { getArchitectureError, normalizeArchitecture, parseArchitecture } from "../../shared/site-architecture.ts";

export interface NormalizedSiteStoragePayload {
  name: string;
  slug: string;
  url: string;
  monitorKey: string | null;
  category: SitePayload["category"];
  description: string;
  summary: string;
  tagsJson: string;
  techStackJson: string;
  isFeaturedValue: 1 | 0;
  repoUrl: string | null;
  fallbackUrl: string | null;
  coverUrl: string | null;
  architectureJson: string | null;
  coverMode: SitePayload["coverMode"];
  sortOrder: number;
  isVisibleValue: 1 | 0;
  allowInteractionValue: 1 | 0;
}

interface SiteRowForMapping {
  id: number;
  name: string;
  slug: string;
  url: string;
  monitor_key: string | null;
  category: string;
  description: string;
  summary?: string | null;
  tags?: string | null;
  tech_stack?: string | null;
  is_featured?: number | null;
  repo_url?: string | null;
  fallback_url?: string | null;
  cover_url?: string | null;
  architecture?: string | null;
  cover_mode: string;
  sort_order: number;
  is_visible: number;
  allow_interaction: number;
  created_at: string;
  updated_at: string;
}

export function getSitePayloadValidationError(
  payload: Partial<SitePayload>
): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Invalid site payload";
  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return "Site name is required";
  }

  if (typeof payload.slug !== "string" || !payload.slug.trim()) {
    return "Site slug is required";
  }

  if (typeof payload.url !== "string" || !payload.url.trim()) {
    return "Site URL is required";
  }

  try {
    const url = new URL(payload.url);
    if (url.protocol !== "https:") {
      return "Site URL must start with https://";
    }
  } catch {
    return "Site URL must be a valid absolute URL";
  }

  if (typeof payload.description !== "string") return "Description must be a string";
  if (payload.monitorKey !== null && typeof payload.monitorKey !== "string") return "Monitor key must be a string or null";
  if (!["web", "landing", "tool", "other"].includes(payload.category ?? "")) return "Invalid site category";
  if (!["iframe", "text", "gallery"].includes(payload.coverMode ?? "")) return "Invalid cover mode";
  if (!Number.isSafeInteger(payload.sortOrder)) return "Sort order must be an integer";
  if (typeof payload.isVisible !== "boolean" || typeof payload.allowInteraction !== "boolean") return "Invalid site flags";

  if (typeof payload.summary !== "string") {
    return "Summary is required";
  }

  if (!Array.isArray(payload.tags)) {
    return "Tags must be an array";
  }

  if (!Array.isArray(payload.techStack)) {
    return "Tech stack must be an array";
  }

  if (typeof payload.isFeatured !== "boolean") {
    return "Featured flag is required";
  }

  if (payload.repoUrl === undefined) {
    return "Repo URL field is required";
  }

  if (payload.fallbackUrl === undefined) {
    return "Fallback URL field is required";
  }

  if (payload.summary.trim().length > 120) {
    return "Summary must be 120 characters or fewer";
  }

  if (!hasOnlyStringItems(payload.tags)) {
    return "Tags must contain only strings";
  }

  if (!hasOnlyStringItems(payload.techStack)) {
    return "Tech stack must contain only strings";
  }

  const repoUrlError = getOptionalHttpsUrlError(payload.repoUrl, "Repo");

  if (repoUrlError) {
    return repoUrlError;
  }

  const fallbackUrlError = getOptionalHttpsUrlError(
    payload.fallbackUrl,
    "Fallback"
  );

  if (fallbackUrlError) {
    return fallbackUrlError;
  }

  // Older clients may omit the new optional field during a rolling update.
  if (payload.coverUrl != null &&
      (typeof payload.coverUrl !== "string" || (payload.coverUrl.trim() && !isCoverUrl(payload.coverUrl.trim())))) {
    return "Cover URL must be a valid http(s) image URL";
  }

  return getArchitectureError(payload.architecture);
}

export function normalizeSitePayloadForStorage(
  payload: SitePayload
): NormalizedSiteStoragePayload {
  return {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    url: payload.url.trim(),
    monitorKey: payload.monitorKey?.trim() ? payload.monitorKey.trim() : null,
    category: payload.category,
    description: payload.description.trim(),
    summary: payload.summary.trim(),
    tagsJson: JSON.stringify(normalizeStringArray(payload.tags)),
    techStackJson: JSON.stringify(normalizeStringArray(payload.techStack)),
    isFeaturedValue: payload.isFeatured ? 1 : 0,
    repoUrl: normalizeOptionalUrl(payload.repoUrl),
    fallbackUrl: normalizeOptionalUrl(payload.fallbackUrl),
    coverUrl: normalizeOptionalUrl(payload.coverUrl ?? null),
    architectureJson: normalizeArchitecture(payload.architecture) ? JSON.stringify(normalizeArchitecture(payload.architecture)) : null,
    coverMode: payload.coverMode,
    sortOrder: payload.sortOrder,
    isVisibleValue: payload.isVisible ? 1 : 0,
    allowInteractionValue: payload.allowInteraction ? 1 : 0,
  };
}

export function parsePortfolioStringArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    if (!parsed.every((item) => typeof item === "string")) {
      return [];
    }

    return normalizeStringArray(parsed);
  } catch {
    return [];
  }
}

export function mapSiteRowToSiteRecord(row: SiteRowForMapping): SiteRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    url: row.url,
    monitorKey: row.monitor_key,
    category: row.category as SiteRecord["category"],
    description: row.description,
    summary: row.summary ?? "",
    tags: parsePortfolioStringArray(row.tags),
    techStack: parsePortfolioStringArray(row.tech_stack),
    isFeatured: row.is_featured === 1,
    repoUrl: normalizeOptionalUrl(row.repo_url ?? null),
    fallbackUrl: normalizeOptionalUrl(row.fallback_url ?? null),
    coverUrl: isCoverUrl(row.cover_url) ? row.cover_url.trim() : null,
    architecture: parseArchitecture(row.architecture),
    coverMode: row.cover_mode as SiteRecord["coverMode"],
    sortOrder: row.sort_order,
    isVisible: row.is_visible === 1,
    allowInteraction: row.allow_interaction === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getSiteMutationErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error);

  if (isDuplicateSlugError(message)) {
    return "Duplicate slug";
  }

  return fallback;
}

function isDuplicateSlugError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unique constraint") ||
    normalized.includes("sites.slug") ||
    normalized.includes("duplicate slug")
  );
}

function getOptionalHttpsUrlError(
  value: unknown,
  label: "Repo" | "Fallback"
) {
  if (value !== null && typeof value !== "string") {
    return `${label} URL must be a string or null`;
  }

  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return `${label} URL must start with https://`;
    }
  } catch {
    return `${label} URL must be a valid absolute URL`;
  }

  return null;
}

function normalizeOptionalUrl(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function hasOnlyStringItems(values: string[]) {
  return values.every((value) => typeof value === "string");
}

function normalizeStringArray(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

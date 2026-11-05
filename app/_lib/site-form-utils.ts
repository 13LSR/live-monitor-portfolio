import type { SitePayload } from "@/shared/contracts";
import { isCoverUrl } from "../../shared/site-cover.ts";

interface NextSlugInput {
  currentSlug: string;
  name: string;
  url: string;
  slugEditedManually: boolean;
}

export function createSlugFromSiteInput(name: string, url: string) {
  const source = name.trim() || getUrlHost(url);
  return slugify(source);
}

export function getNextSlugValue({
  currentSlug,
  name,
  url,
  slugEditedManually,
}: NextSlugInput) {
  if (slugEditedManually) {
    return currentSlug;
  }

  return createSlugFromSiteInput(name, url);
}

export function validateAdminSitePayload(payload: SitePayload) {
  if (!payload.name.trim()) {
    return "请填写站点名称。";
  }

  if (!payload.slug.trim()) {
    return "请填写站点 slug。";
  }

  if (!payload.url.trim()) {
    return "请填写网站地址。";
  }

  try {
    const url = new URL(payload.url.trim());
    if (url.protocol !== "https:") {
      return "网站地址必须以 https:// 开头。";
    }
  } catch {
    return "请输入有效的 https:// 网站地址。";
  }

  if (payload.summary.trim().length > 120) {
    return "作品简介不能超过 120 个字。";
  }

  const repoUrlError = getOptionalHttpsUrlError(payload.repoUrl, "源码链接");

  if (repoUrlError) {
    return repoUrlError;
  }

  const fallbackUrlError = getOptionalHttpsUrlError(
    payload.fallbackUrl,
    "备用访问链接"
  );

  if (fallbackUrlError) {
    return fallbackUrlError;
  }

  if (payload.coverUrl?.trim() && !isCoverUrl(payload.coverUrl.trim())) {
    return "请输入有效的 http:// 或 https:// 封面图片链接（最多 2048 字符）。";
  }

  return null;
}

export function buildSitePayloadForSubmit(payload: SitePayload): SitePayload {
  return {
    ...payload,
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    url: payload.url.trim(),
    monitorKey: payload.monitorKey?.trim() ? payload.monitorKey.trim() : null,
    description: payload.description.trim(),
    summary: payload.summary.trim(),
    tags: normalizeListValues(payload.tags),
    techStack: normalizeListValues(payload.techStack),
    repoUrl: normalizeOptionalUrl(payload.repoUrl),
    fallbackUrl: normalizeOptionalUrl(payload.fallbackUrl),
    coverUrl: normalizeOptionalUrl(payload.coverUrl ?? null),
  };
}

export function addUniqueListValue(values: string[], value: string) {
  return normalizeListValues([...values, value]);
}

export function removeListValue(values: string[], value: string) {
  return values.filter((item) => item !== value);
}

function getOptionalHttpsUrlError(value: string | null, label: string) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:") {
      return `${label}必须以 https:// 开头。`;
    }
  } catch {
    return `请输入有效的 https:// ${label}。`;
  }

  return null;
}

function normalizeOptionalUrl(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeListValues(values: string[]) {
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

function getUrlHost(url: string) {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return url.trim();
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

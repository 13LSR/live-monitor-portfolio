import type { SitePayload } from "@/shared/contracts";

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
  };
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

export const DEFAULT_COVER_URL = "https://eo-vpic.byz.qzz.io/";

export function isCoverUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function resolveCoverUrl(value?: string | null) {
  const trimmed = value?.trim();
  return isCoverUrl(trimmed) ? trimmed : DEFAULT_COVER_URL;
}

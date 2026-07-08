import type { SitePayload } from "../../shared/contracts";

export function getSitePayloadValidationError(
  payload: Partial<SitePayload>
): string | null {
  if (!payload.name?.trim()) {
    return "Site name is required";
  }

  if (!payload.slug?.trim()) {
    return "Site slug is required";
  }

  if (!payload.url?.trim()) {
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

  return null;
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

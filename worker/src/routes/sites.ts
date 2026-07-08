import type { Env } from "../auth";
import { isAuthenticated } from "../auth";
import {
  deleteSiteById,
  insertSite,
  listSites,
  seedDefaultSite,
  updateSiteById,
} from "../db";
import {
  getSiteMutationErrorMessage,
  getSitePayloadValidationError,
} from "../site-validation";
import type { SitePayload } from "../../../shared/contracts";

export async function handleGetSites(request: Request, env: Env) {
  const url = new URL(request.url);
  const includeHidden = url.searchParams.get("includeHidden") === "1";
  const authenticated = includeHidden
    ? await isAuthenticated(request, env)
    : false;
  const rows = await listSites(env, includeHidden && authenticated);

  const sites = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    url: row.url,
    monitorKey: row.monitor_key,
    category: row.category,
    description: row.description,
    coverMode: row.cover_mode,
    sortOrder: row.sort_order,
    isVisible: row.is_visible === 1,
    allowInteraction: row.allow_interaction === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return Response.json({ sites });
}

export async function handleSeedSites(request: Request, env: Env) {
  const authenticated = await isAuthenticated(request, env);

  if (!authenticated) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inserted = await seedDefaultSite(env);

    return Response.json({
      ok: true,
      seeded: inserted,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Failed to seed default site" },
      { status: 500 }
    );
  }
}

function normalizeSitePayload(payload: SitePayload): SitePayload {
  return {
    ...payload,
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    url: payload.url.trim(),
    monitorKey: payload.monitorKey?.trim() ? payload.monitorKey.trim() : null,
    description: payload.description.trim(),
  };
}

export async function handleCreateSite(request: Request, env: Env) {
  const authenticated = await isAuthenticated(request, env);

  if (!authenticated) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rawPayload = (await request.json()) as Partial<SitePayload>;
  const validationError = getSitePayloadValidationError(rawPayload);

  if (validationError) {
    return Response.json({ ok: false, error: validationError }, { status: 400 });
  }

  const payload = normalizeSitePayload(rawPayload as SitePayload);

  try {
    await insertSite(env, payload);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        ok: false,
        error: getSiteMutationErrorMessage(error, "Failed to create site"),
      },
      { status: 500 }
    );
  }
}

export async function handleUpdateSite(
  request: Request,
  env: Env,
  id: number
) {
  const authenticated = await isAuthenticated(request, env);

  if (!authenticated) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rawPayload = (await request.json()) as Partial<SitePayload>;
  const validationError = getSitePayloadValidationError(rawPayload);

  if (validationError) {
    return Response.json({ ok: false, error: validationError }, { status: 400 });
  }

  const payload = normalizeSitePayload(rawPayload as SitePayload);

  try {
    const result = await updateSiteById(env, id, payload);

    if (!result.success) {
      return Response.json(
        { ok: false, error: "Failed to update site" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        ok: false,
        error: getSiteMutationErrorMessage(error, "Failed to update site"),
      },
      { status: 500 }
    );
  }
}

export async function handleDeleteSite(
  request: Request,
  env: Env,
  id: number
) {
  const authenticated = await isAuthenticated(request, env);

  if (!authenticated) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deleteSiteById(env, id);

    if (!result.success) {
      return Response.json(
        { ok: false, error: "Failed to delete site" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Failed to delete site" },
      { status: 500 }
    );
  }
}

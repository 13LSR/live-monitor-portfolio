import type { Env } from "../auth.ts";
import { isAuthenticated } from "../auth.ts";
import {
  deleteSiteById,
  insertSite,
  listSites,
  seedDefaultSite,
  updateSiteById,
} from "../db.ts";
import {
  getSiteMutationErrorMessage,
  getSitePayloadValidationError,
  mapSiteRowToSiteRecord,
} from "../site-validation.ts";
import type { SitePayload } from "../../../shared/contracts";
import { readJsonObject } from "../http.ts";

export async function handleGetSites(request: Request, env: Env) {
  const url = new URL(request.url);
  const includeHidden = url.searchParams.get("includeHidden") === "1";
  const authenticated = includeHidden
    ? await isAuthenticated(request, env)
    : false;
  const rows = await listSites(env, includeHidden && authenticated);

  const sites = rows.map(mapSiteRowToSiteRecord);

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

  const rawPayload = await readJsonObject(request) as Partial<SitePayload>;
  const validationError = getSitePayloadValidationError(rawPayload);

  if (validationError) {
    return Response.json({ ok: false, error: validationError }, { status: 400 });
  }

  const payload = normalizeSitePayload(rawPayload as SitePayload);

  try {
    const result = await insertSite(env, payload);
    if (!result.success) {
      return Response.json({ ok: false, error: "Failed to create site" }, { status: 500 });
    }
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

  const rawPayload = await readJsonObject(request) as Partial<SitePayload>;
  const validationError = getSitePayloadValidationError(rawPayload);

  if (validationError) {
    return Response.json({ ok: false, error: validationError }, { status: 400 });
  }

  const payload = normalizeSitePayload(rawPayload as SitePayload);

  try {
    const result = await updateSiteById(env, id, payload);

    if (result.meta?.changes === 0) {
      return Response.json({ ok: false, error: "Site not found" }, { status: 404 });
    }

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

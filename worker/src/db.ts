import type { Env } from "./auth";
import type { SitePayload } from "../../shared/contracts";

export interface SiteRow {
  id: number;
  name: string;
  slug: string;
  url: string;
  monitor_key: string | null;
  category: string;
  description: string;
  cover_mode: string;
  sort_order: number;
  is_visible: number;
  allow_interaction: number;
  created_at: string;
  updated_at: string;
}

export async function listSites(env: Env, includeHidden = false) {
  const statement = env.DB.prepare(
    includeHidden
      ? `SELECT id, name, slug, url, monitor_key, category, description, cover_mode, sort_order, is_visible, allow_interaction, created_at, updated_at
         FROM sites
         ORDER BY sort_order ASC, id ASC`
      : `SELECT id, name, slug, url, monitor_key, category, description, cover_mode, sort_order, is_visible, allow_interaction, created_at, updated_at
         FROM sites
         WHERE is_visible = 1
         ORDER BY sort_order ASC, id ASC`
  );
  const result = await statement.all<SiteRow>();
  return result.results ?? [];
}

export async function insertSite(env: Env, payload: SitePayload) {
  const now = new Date().toISOString();

  return env.DB.prepare(
    `INSERT INTO sites (
      name, slug, url, monitor_key, category, description, cover_mode,
      sort_order, is_visible, allow_interaction, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      payload.name,
      payload.slug,
      payload.url,
      payload.monitorKey,
      payload.category,
      payload.description,
      payload.coverMode,
      payload.sortOrder,
      payload.isVisible ? 1 : 0,
      payload.allowInteraction ? 1 : 0,
      now,
      now
    )
    .run();
}

export async function updateSiteById(
  env: Env,
  id: number,
  payload: SitePayload
) {
  const now = new Date().toISOString();

  return env.DB.prepare(
    `UPDATE sites
     SET name = ?, slug = ?, url = ?, monitor_key = ?, category = ?, description = ?,
         cover_mode = ?, sort_order = ?, is_visible = ?, allow_interaction = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      payload.name,
      payload.slug,
      payload.url,
      payload.monitorKey,
      payload.category,
      payload.description,
      payload.coverMode,
      payload.sortOrder,
      payload.isVisible ? 1 : 0,
      payload.allowInteraction ? 1 : 0,
      now,
      id
    )
    .run();
}

export async function deleteSiteById(env: Env, id: number) {
  return env.DB.prepare(`DELETE FROM sites WHERE id = ?`).bind(id).run();
}

export async function countSites(env: Env) {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM sites`
  ).first<{ total: number | string }>();

  return Number(result?.total ?? 0);
}

export async function seedDefaultSite(env: Env) {
  const total = await countSites(env);

  if (total > 0) {
    return false;
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO sites (
      name, slug, url, monitor_key, category, description, cover_mode,
      sort_order, is_visible, allow_interaction, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      "网易云音乐 Demo",
      "wyy-331106-xyz",
      "https://wyy.331106.xyz",
      "wyy.331106.xyz",
      "web",
      "已部署在线站点，作为活体 iframe 监控卡片的首个演示目标。",
      "iframe",
      10,
      1,
      0,
      now,
      now
    )
    .run();

  return true;
}

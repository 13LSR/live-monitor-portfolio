"use client";

import { useState } from "react";
import type { SiteRecord } from "@/shared/types";

interface AdminSiteTableProps {
  sites: SiteRecord[];
  deletingId: number | null;
  pending?: boolean;
  selectedId?: number;
  onEdit: (site: SiteRecord) => void;
  onDelete: (site: SiteRecord) => Promise<void>;
}

export function AdminSiteTable({ sites, deletingId, pending, selectedId, onEdit, onDelete }: AdminSiteTableProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const filtered = sites.filter((site) => [site.name, site.slug, site.url].some((value) => value.toLowerCase().includes(search)));

  async function handleConfirmDelete(site: SiteRecord) {
    await onDelete(site);
    setConfirmingDeleteId(null);
  }

  return <div className="admin-site-list">
    <header><div><h2>岛上站点</h2><span>{sites.length} 个网站</span></div>
      <label className="admin-search"><span className="sr-only">搜索站点</span><input type="search" value={query}
        onChange={(event) => setQuery(event.currentTarget.value)} placeholder="搜索名称或网址…" className="admin-input" /></label>
    </header>
    <div className="admin-site-list__items">
      {filtered.map((site) => <article key={site.id} className={selectedId === site.id ? "admin-site-item is-selected" : "admin-site-item"}>
        <button className="admin-site-item__select" type="button" disabled={pending} onClick={() => onEdit(site)} aria-current={selectedId === site.id ? "true" : undefined}>
          <span><strong>{site.name}</strong><small>{site.url}</small></span><span aria-hidden="true">↗</span>
        </button>
        <div className="admin-site-item__flags"><span className={site.isVisible ? "is-public" : ""}>{site.isVisible ? "公开" : "隐藏"}</span>
          {site.isFeatured ? <span>精选</span> : null}<span>{site.allowInteraction ? "允许交互" : "仅预览"}</span></div>
        <div className="admin-site-item__actions">
          <button type="button" disabled={pending} onClick={() => onEdit(site)}>编辑资料</button>
          <a href={site.url} target="_blank" rel="noreferrer">打开站点</a>
          {confirmingDeleteId === site.id ? <>
            <button type="button" className="is-danger" disabled={pending} onClick={() => void handleConfirmDelete(site)}>{deletingId === site.id ? "删除中…" : "确认删除"}</button>
            <button type="button" disabled={pending} onClick={() => setConfirmingDeleteId(null)}>取消删除</button>
          </> : <button type="button" disabled={pending} onClick={() => setConfirmingDeleteId(site.id)}>删除</button>}
        </div>
      </article>)}
      {!filtered.length ? <p className="admin-list-empty">{search ? "没有匹配的网站" : "暂无站点数据"}</p> : null}
    </div>
  </div>;
}

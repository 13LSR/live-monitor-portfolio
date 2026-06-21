"use client";

import type { SiteRecord } from "@/shared/types";

interface AdminSiteTableProps {
  sites: SiteRecord[];
  deletingId: number | null;
  onEdit: (site: SiteRecord) => void;
  onDelete: (site: SiteRecord) => Promise<void>;
}

export function AdminSiteTable({
  sites,
  deletingId,
  onEdit,
  onDelete,
}: AdminSiteTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-xl shadow-slate-950/20">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">站点列表</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Monitor</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id} className="border-t border-white/5">
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{site.name}</div>
                  <div className="text-xs text-slate-500">{site.slug}</div>
                </td>
                <td className="px-4 py-4 text-xs text-slate-400">
                  {site.monitorKey ?? "—"}
                </td>
                <td className="px-4 py-4 text-xs uppercase text-slate-400">
                  {site.coverMode}
                </td>
                <td className="px-4 py-4">
                  {site.isVisible ? "Yes" : "No"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(site)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(site)}
                      disabled={deletingId === site.id}
                      className="rounded-full border border-rose-500/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-rose-200 transition hover:border-rose-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === site.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  暂无站点数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

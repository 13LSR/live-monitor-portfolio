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
    <div className="overflow-hidden border border-[var(--line)] bg-[var(--paper-raised)] shadow-[8px_8px_0_rgba(31,37,35,0.16)]">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">站点列表</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-[var(--ink)]">
          <thead className="bg-[#e7eadf] font-mono text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">站点</th>
              <th className="px-4 py-3">监控</th>
              <th className="px-4 py-3">展示</th>
              <th className="px-4 py-3">公开</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-4">
                  <div className="font-semibold text-[var(--ink)]">
                    {site.name}
                  </div>
                  <div className="font-mono text-xs text-[var(--muted)]">
                    {site.slug}
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs text-[var(--muted)]">
                  {site.monitorKey ?? "—"}
                </td>
                <td className="px-4 py-4 font-mono text-xs uppercase text-[var(--muted)]">
                  {site.coverMode}
                </td>
                <td className="px-4 py-4">
                  {site.isVisible ? "是" : "否"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(site)}
                      className="border border-[var(--line)] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[#e7eadf]"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(site)}
                      disabled={deletingId === site.id}
                      className="border border-[var(--line)] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold text-[var(--red)] transition hover:bg-[#f6ded7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === site.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--muted)]">
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

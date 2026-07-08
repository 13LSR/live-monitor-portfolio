"use client";

import { useState } from "react";
import { Button, Card, Tag } from "animal-island-ui";
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null
  );

  async function handleConfirmDelete(site: SiteRecord) {
    await onDelete(site);
    setConfirmingDeleteId(null);
  }

  function renderActions(site: SiteRecord) {
    const isConfirming = confirmingDeleteId === site.id;
    const isDeleting = deletingId === site.id;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          htmlType="button"
          type="default"
          size="small"
          onClick={() => onEdit(site)}
          disabled={isDeleting}
        >
          编辑
        </Button>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="border border-[var(--line)] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[#e7eadf]"
        >
          打开站点
        </a>
        {isConfirming ? (
          <>
            <Button
              htmlType="button"
              type="default"
              size="small"
              onClick={() => void handleConfirmDelete(site)}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
            <Button
              htmlType="button"
              type="default"
              size="small"
              onClick={() => setConfirmingDeleteId(null)}
              disabled={isDeleting}
            >
              取消删除
            </Button>
          </>
        ) : (
          <Button
            htmlType="button"
            type="default"
            size="small"
            onClick={() => setConfirmingDeleteId(site.id)}
            disabled={isDeleting}
          >
            删除
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      color="app-yellow"
      pattern="app-yellow"
      className="overflow-hidden border border-[var(--line)] shadow-[8px_8px_0_rgba(31,37,35,0.16)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">岛上站点</h2>
        <Tag color="app-teal" variant="outlined" size="small">
          {sites.length} 个小屋
        </Tag>
      </div>
      <div className="divide-y divide-[var(--line)] md:hidden">
        {sites.map((site) => (
          <article key={site.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--ink)]">
                  {site.name}
                </h3>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {site.slug}
                </p>
              </div>
              <span className="border border-[var(--line)] bg-[#fffaf0] px-2 py-1 font-mono text-[0.68rem] uppercase text-[var(--muted)]">
                {site.coverMode}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <dt className="text-[var(--muted)]">监控</dt>
                <dd className="min-w-0 break-words font-mono text-xs text-[var(--ink)]">
                  {site.monitorKey ?? "-"}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <dt className="text-[var(--muted)]">公开</dt>
                <dd className="text-[var(--ink)]">
                  {site.isVisible ? "是" : "否"}
                </dd>
              </div>
            </dl>
            <div className="mt-4">{renderActions(site)}</div>
          </article>
        ))}
        {sites.length === 0 ? (
          <p className="px-4 py-6 text-center text-[var(--muted)]">
            暂无站点数据
          </p>
        ) : null}
      </div>
      <div className="hidden md:block">
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
            {sites.map((site) => {
              return (
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
                    {site.monitorKey ?? "-"}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs uppercase text-[var(--muted)]">
                    {site.coverMode}
                  </td>
                  <td className="px-4 py-4">
                    {site.isVisible ? "是" : "否"}
                  </td>
                  <td className="px-4 py-4">{renderActions(site)}</td>
                </tr>
              );
            })}
            {sites.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-[var(--muted)]"
                >
                  暂无站点数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

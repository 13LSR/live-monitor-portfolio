"use client";

import { useEffect, useState } from "react";
import { Button, Card, Tag } from "animal-island-ui";
import {
  createSite,
  deleteSite,
  getAuthState,
  getSites,
  login,
  logout,
  updateSite,
} from "@/app/_lib/api-client";
import { getFriendlyApiErrorMessage } from "@/app/_lib/api-errors";
import { AdminLoginForm } from "@/app/_components/admin-login-form";
import { AdminSiteForm } from "@/app/_components/admin-site-form";
import { AdminSiteTable } from "@/app/_components/admin-site-table";
import type { SitePayload } from "@/shared/contracts";
import type { SiteRecord } from "@/shared/types";

const hasApiBaseUrl = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

export function AdminDashboard() {
  const initialMessage = "请输入管理员密码。";
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(hasApiBaseUrl);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [message, setMessage] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);

  useEffect(() => {
    if (!hasApiBaseUrl) {
      return;
    }

    async function bootstrap() {
      try {
        const auth = await getAuthState();
        setAuthenticated(auth.authenticated);

        if (auth.authenticated) {
          await refreshSites();
        }
      } catch (error) {
        console.error(error);
        setMessage(getErrorMessage(error, "管理入口暂时不可用，请稍后再试。"));
      } finally {
        setCheckingAuth(false);
      }
    }

    void bootstrap();
  }, []);

  async function refreshSites() {
    const response = await getSites({ includeHidden: true });
    setSites(response.sites);
  }

  async function handleLogin(password: string) {
    if (!hasApiBaseUrl) {
      throw new Error("管理入口暂时不可用，请稍后再试。");
    }

    await login({ password });
    setAuthenticated(true);
    setMessage("登录成功。");
    await refreshSites();
  }

  async function handleLogout() {
    await logout();
    setAuthenticated(false);
    setSites([]);
    setEditingSite(null);
    setMessage("已退出管理员会话。");
  }

  async function handleCreate(payload: SitePayload) {
    setSaving(true);
    try {
      await createSite(payload);
      await refreshSites();
      setMessage("站点已创建。");
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error, "创建站点失败。"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload: SitePayload) {
    if (!editingSite) {
      return false;
    }

    setSaving(true);
    try {
      await updateSite(editingSite.id, payload);
      await refreshSites();
      setEditingSite(null);
      setMessage("站点已更新。");
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error, "更新站点失败。"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(site: SiteRecord) {
    setDeletingId(site.id);
    try {
      await deleteSite(site.id);
      await refreshSites();
      if (editingSite?.id === site.id) {
        setEditingSite(null);
      }
      setMessage("站点已删除。");
    } catch (error) {
      setMessage(getErrorMessage(error, "删除站点失败。"));
    } finally {
      setDeletingId(null);
    }
  }

  if (checkingAuth) {
    return (
      <AdminLoginForm
        key={`checking-${message}`}
        onSubmitPassword={handleLogin}
        message={message}
      />
    );
  }

  if (!authenticated) {
    return (
      <AdminLoginForm
        key={`login-${message}`}
        onSubmitPassword={handleLogin}
        message={message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card
        color="warm-peach-pink"
        pattern="warm-peach-pink"
        className="border border-[var(--line)] p-5 shadow-[8px_8px_0_rgba(31,37,35,0.16)]"
      >
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs uppercase text-[var(--muted)]">
                Island office
              </p>
              <Tag color="app-teal" variant="outlined" size="small">
                岛务管理所
              </Tag>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
              管理岛上的网站小屋
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {message}
            </p>
          </div>
          <Button
            htmlType="button"
            type="default"
            size="small"
            onClick={() => void handleLogout()}
          >
            退出登录
          </Button>
        </section>
      </Card>
      <AdminSiteTable
        sites={sites}
        deletingId={deletingId}
        onEdit={setEditingSite}
        onDelete={handleDelete}
      />
      <AdminSiteForm
        key={editingSite?.id ?? "create"}
        mode={editingSite ? "edit" : "create"}
        initialSite={editingSite}
        pending={saving}
        onSubmit={editingSite ? handleUpdate : handleCreate}
        onCancel={editingSite ? () => setEditingSite(null) : undefined}
      />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return getFriendlyApiErrorMessage(error, fallback);
}

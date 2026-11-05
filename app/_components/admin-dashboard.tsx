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
import { verifySavedSite } from "@/app/_lib/site-save-verification";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const busy = saving || deletingId !== null;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function openEditor(site: SiteRecord | null) {
    if (busy || (dirty && !window.confirm("当前修改还未保存，确定放弃并切换吗？"))) return;
    setEditingSite(site);
    setEditorRevision((value) => value + 1);
    setDirty(false);
    setEditorOpen(true);
    setMessage("");
    window.requestAnimationFrame(() => document.getElementById("admin-site-editor")?.scrollIntoView({ block: "start" }));
  }

  function closeEditor() {
    if (busy || (dirty && !window.confirm("当前修改还未保存，确定返回列表吗？"))) return;
    setEditorOpen(false);
    setEditingSite(null);
    setDirty(false);
  }

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
    return response.sites;
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
    if (busy || (dirty && !window.confirm("当前修改还未保存，确定退出吗？"))) return;
    await logout();
    setAuthenticated(false);
    setSites([]);
    setEditingSite(null);
    setEditorOpen(false);
    setDirty(false);
    setMessage("已退出管理员会话。");
  }

  async function handleCreate(payload: SitePayload) {
    setSaving(true);
    try {
      await createSite(payload);
      verifySavedSite(await refreshSites(), payload);
      setDirty(false);
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
      const saved = verifySavedSite(await refreshSites(), payload, editingSite.id);
      setEditingSite(saved);
      setDirty(false);
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
    if (busy) return;
    setDeletingId(site.id);
    try {
      await deleteSite(site.id);
      await refreshSites();
      if (editingSite?.id === site.id) {
        setEditingSite(null);
        setEditorOpen(false);
        setDirty(false);
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
    <div className={`admin-workspace${editorOpen ? " is-editing" : ""}`}>
      <Card color="warm-peach-pink" pattern="warm-peach-pink" className="admin-topbar">
        <div><p className="admin-eyebrow">Island office <Tag color="app-teal" variant="outlined" size="small">岛务管理所</Tag></p>
          <h1>管理岛上的网站小屋</h1><p>集中管理网站、封面与作品资料。</p></div>
        <div className="admin-topbar__actions"><button type="button" className="admin-primary" disabled={busy} onClick={() => openEditor(null)}>＋ 新建站点</button>
          <Button htmlType="button" type="default" size="small" disabled={busy} onClick={() => void handleLogout()}>退出登录</Button></div>
      </Card>
      {!editorOpen && message ? <p className="admin-feedback" role="status">{message}</p> : null}
      <div className="admin-workspace__body">
        <aside className="admin-workspace__list" aria-label="站点列表">
          <AdminSiteTable sites={sites} deletingId={deletingId} pending={busy} selectedId={editingSite?.id}
            onEdit={openEditor} onDelete={handleDelete} />
        </aside>
        <section className="admin-workspace__editor" aria-label="站点编辑">
          {editorOpen ? <AdminSiteForm
            key={`${editingSite?.id ?? "create"}:${editorRevision}`}
            mode={editingSite ? "edit" : "create"}
            initialSite={editingSite}
            pending={saving}
            onSubmit={editingSite ? handleUpdate : handleCreate}
            onCancel={closeEditor}
            feedback={message}
            onDirtyChange={setDirty}
          /> : <div className="admin-empty-editor"><span aria-hidden="true">↖</span><h2>选择一个网站，开始编辑</h2><p>修改封面、技术栈或展示设置。保存按钮始终停留在编辑区顶部。</p><button type="button" onClick={() => openEditor(null)}>创建第一个或下一个作品 ↗</button></div>}
        </section>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return getFriendlyApiErrorMessage(error, fallback);
}

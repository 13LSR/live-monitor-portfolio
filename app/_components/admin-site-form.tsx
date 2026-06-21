"use client";

import { FormEvent, useState } from "react";
import type { SitePayload } from "@/shared/contracts";
import type { SiteRecord } from "@/shared/types";

const emptyForm: SitePayload = {
  name: "",
  slug: "",
  url: "",
  monitorKey: null,
  category: "web",
  description: "",
  coverMode: "iframe",
  sortOrder: 0,
  isVisible: true,
  allowInteraction: false,
};

interface AdminSiteFormProps {
  mode: "create" | "edit";
  initialSite?: SiteRecord | null;
  pending: boolean;
  onSubmit: (payload: SitePayload) => Promise<boolean>;
  onCancel?: () => void;
}

export function AdminSiteForm({
  mode,
  initialSite,
  pending,
  onSubmit,
  onCancel,
}: AdminSiteFormProps) {
  const isEditModeWithoutSelection = mode === "edit" && !initialSite;
  const [form, setForm] = useState<SitePayload>(() =>
    getFormState(initialSite)
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const succeeded = await onSubmit({
      ...form,
      monitorKey: form.monitorKey?.trim() ? form.monitorKey.trim() : null,
    });

    if (mode === "create" && succeeded) {
      setForm(emptyForm);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.96)_100%)] p-6 shadow-xl shadow-slate-950/20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {mode === "create" ? "新增站点" : "编辑站点"}
        </h2>
        {mode === "edit" && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="名称"
          hint="前台卡片标题，例如：网易云音乐 Demo"
        >
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="admin-input"
            placeholder="网易云音乐 Demo"
            required
          />
        </Field>
        <Field
          label="Slug"
          hint="用于后台识别和稳定键值，建议使用小写英文和连字符"
        >
          <input
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, slug: event.target.value }))
            }
            className="admin-input"
            placeholder="wyy-331106-xyz"
            required
          />
        </Field>
        <Field
          label="URL"
          hint="网站真实可访问地址，必须带 https://"
        >
          <input
            value={form.url}
            onChange={(event) =>
              setForm((current) => ({ ...current, url: event.target.value }))
            }
            className="admin-input md:col-span-2"
            placeholder="https://wyy.331106.xyz"
            required
          />
        </Field>
        <Field
          label="Monitor Key"
          hint="对应 UptimeFlare monitors 对象里的 key，通常就是域名"
        >
          <input
            value={form.monitorKey ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                monitorKey: event.target.value,
              }))
            }
            className="admin-input"
            placeholder="wyy.331106.xyz"
          />
        </Field>
        <Field
          label="排序"
          hint="数字越小越靠前，首页卡片按这个值排序"
        >
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sortOrder: Number(event.target.value),
              }))
            }
            className="admin-input"
          />
        </Field>
      </div>
      <Field
        label="描述"
        hint="展示在卡片底部，简短说明这个网站是什么"
      >
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={4}
          className="admin-input min-h-28 resize-y"
          placeholder="已部署在线站点，展示真实网页运行状态。"
        />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="分类"
          hint="仅用于后台管理和后续过滤，普通网站先选 web"
        >
          <select
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                category: event.target.value as SitePayload["category"],
              }))
            }
            className="admin-input"
          >
            <option value="web">web</option>
            <option value="landing">landing</option>
            <option value="tool">tool</option>
            <option value="other">other</option>
          </select>
        </Field>
        <Field
          label="展示模式"
          hint="当前真实活体网页展示请选择 iframe"
        >
          <select
            value={form.coverMode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                coverMode: event.target.value as SitePayload["coverMode"],
              }))
            }
            className="admin-input"
          >
            <option value="iframe">iframe</option>
            <option value="text">text</option>
            <option value="gallery">gallery</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleCard
          title="公开展示"
          description="开启后，这个站点会出现在首页作品集里；关闭后只在后台保留。"
        >
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isVisible: event.target.checked,
              }))
            }
          />
        </ToggleCard>
        <ToggleCard
          title="允许交互模式"
          description="开启后，后续可以在前台给这张卡片提供可点击交互模式；关闭时默认只预览，不响应鼠标。"
        >
          <input
            type="checkbox"
            checked={form.allowInteraction}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                allowInteraction: event.target.checked,
              }))
            }
          />
        </ToggleCard>
      </div>
      <div className="rounded-2xl border border-cyan-400/12 bg-cyan-400/6 p-4 text-sm leading-6 text-slate-300">
        推荐填写规则：
        <br />
        - 普通在线网站：分类选 `web`
        <br />
        - 活体展示：展示模式选 `iframe`
        <br />
        - UptimeFlare 监控：`Monitor Key` 填该网站在 monitors 里的键名
      </div>
      {isEditModeWithoutSelection ? (
        <div className="rounded-2xl border border-amber-400/15 bg-amber-400/8 p-4 text-sm leading-6 text-amber-100">
          先在上方站点列表里点击 `Edit`，再修改并提交当前站点。
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending || isEditModeWithoutSelection}
        className="rounded-full border border-cyan-400/35 bg-cyan-400/12 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : mode === "create" ? "Create Site" : "Update Site"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-2 text-sm text-slate-300">
      <span className="block font-medium text-slate-100">{label}</span>
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function ToggleCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
      <span className="pt-1">{children}</span>
      <span className="block">
        <span className="block font-medium text-slate-100">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function getFormState(initialSite?: SiteRecord | null): SitePayload {
  if (!initialSite) {
    return emptyForm;
  }

  return {
    name: initialSite.name,
    slug: initialSite.slug,
    url: initialSite.url,
    monitorKey: initialSite.monitorKey,
    category: initialSite.category,
    description: initialSite.description,
    coverMode: initialSite.coverMode,
    sortOrder: initialSite.sortOrder,
    isVisible: initialSite.isVisible,
    allowInteraction: initialSite.allowInteraction,
  };
}

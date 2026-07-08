"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import {
  addUniqueListValue,
  buildSitePayloadForSubmit,
  getNextSlugValue,
  removeListValue,
  validateAdminSitePayload,
} from "@/app/_lib/site-form-utils";
import type { SitePayload } from "@/shared/contracts";
import type { SiteRecord } from "@/shared/types";

const emptyForm: SitePayload = {
  name: "",
  slug: "",
  url: "",
  monitorKey: null,
  category: "web",
  description: "",
  summary: "",
  tags: [],
  techStack: [],
  isFeatured: false,
  repoUrl: null,
  fallbackUrl: null,
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
  const [slugEditedManually, setSlugEditedManually] = useState(
    Boolean(initialSite)
  );
  const [tagInput, setTagInput] = useState("");
  const [techStackInput, setTechStackInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildSitePayloadForSubmit(form);
    const validationError = validateAdminSitePayload(payload);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    const succeeded = await onSubmit(payload);

    if (mode === "create" && succeeded) {
      setForm(emptyForm);
      setSlugEditedManually(false);
    }
  }

  function updateName(name: string) {
    setLocalError(null);
    setForm((current) => {
      const nextSlug = getNextSlugValue({
        currentSlug: current.slug,
        name,
        url: current.url,
        slugEditedManually,
      });
      return { ...current, name, slug: nextSlug };
    });
  }

  function updateUrl(url: string) {
    setLocalError(null);
    setForm((current) => {
      const nextSlug = getNextSlugValue({
        currentSlug: current.slug,
        name: current.name,
        url,
        slugEditedManually,
      });
      return { ...current, url, slug: nextSlug };
    });
  }

  function addListItem(field: "tags" | "techStack", value: string) {
    setLocalError(null);
    setForm((current) => ({
      ...current,
      [field]: addUniqueListValue(current[field], value),
    }));
  }

  function removeListItem(field: "tags" | "techStack", value: string) {
    setLocalError(null);
    setForm((current) => ({
      ...current,
      [field]: removeListValue(current[field], value),
    }));
  }

  function handleListKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    field: "tags" | "techStack",
    value: string,
    clearValue: () => void
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addListItem(field, value);
    clearValue();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-[var(--line)] bg-[var(--paper-raised)] p-5 shadow-[8px_8px_0_rgba(31,37,35,0.16)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {mode === "create" ? "新建站点" : "编辑站点"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {mode === "create"
              ? "录入一个真实运行的网站窗口。"
              : "修改当前选中的网站资料。"}
          </p>
        </div>
        {mode === "edit" && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="border border-[var(--line)] bg-[#fffaf0] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[#e7eadf] disabled:cursor-not-allowed disabled:opacity-60"
          >
            取消
          </button>
        ) : null}
      </div>

      {localError ? (
        <div className="border border-[var(--line)] bg-[#f6ded7] p-3 text-sm font-semibold text-[var(--red)]">
          {localError}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="名称" hint="前台卡片标题，例如：网易云音乐 Demo">
          <input
            value={form.name}
            onChange={(event) => updateName(event.target.value)}
            className="admin-input"
            placeholder="网易云音乐 Demo"
            disabled={pending}
          />
        </Field>
        <Field
          label="Slug"
          hint="默认从名称或 URL 生成；手动修改后不会再自动覆盖"
        >
          <input
            value={form.slug}
            onChange={(event) => {
              setSlugEditedManually(true);
              setLocalError(null);
              setForm((current) => ({
                ...current,
                slug: event.target.value,
              }));
            }}
            className="admin-input"
            placeholder="wyy-331106-xyz"
            disabled={pending}
          />
        </Field>
        <Field label="URL" hint="网站真实可访问地址，必须以 https:// 开头">
          <input
            value={form.url}
            onChange={(event) => updateUrl(event.target.value)}
            className="admin-input"
            placeholder="https://wyy.331106.xyz"
            disabled={pending}
          />
        </Field>
        <Field
          label="Monitor Key"
          hint="对应 UptimeFlare monitors 对象里的 key，通常是域名"
        >
          <input
            value={form.monitorKey ?? ""}
            onChange={(event) => {
              setLocalError(null);
              setForm((current) => ({
                ...current,
                monitorKey: event.target.value,
              }));
            }}
            className="admin-input"
            placeholder="wyy.331106.xyz"
            disabled={pending}
          />
        </Field>
        <Field label="排序" hint="数字越小越靠前，首页卡片按这个值排序">
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
            disabled={pending}
          />
        </Field>
        <Field label="分类" hint="用于首页分类过滤">
          <select
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                category: event.target.value as SitePayload["category"],
              }))
            }
            className="admin-input"
            disabled={pending}
          >
            <option value="web">web</option>
            <option value="landing">landing</option>
            <option value="tool">tool</option>
            <option value="other">other</option>
          </select>
        </Field>
      </div>

      <Field label="描述" hint="简短说明这个网站是什么">
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
          disabled={pending}
        />
      </Field>

      <section className="space-y-5 border border-[var(--line)] bg-[#fffdf7] p-4">
        <div className="border-b border-[var(--line)] pb-3">
          <h3 className="text-base font-semibold text-[var(--ink)]">
            作品信息
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            用更结构化的方式补充首页作品卡会展示的轻量元信息。
          </p>
        </div>

        <Field label="作品简介" hint="最多 120 字，会优先显示在首页卡片摘要里">
          <textarea
            value={form.summary}
            onChange={(event) => {
              setLocalError(null);
              setForm((current) => ({
                ...current,
                summary: event.target.value,
              }));
            }}
            rows={3}
            maxLength={120}
            className="admin-input min-h-24 resize-y"
            placeholder="一句话说明这个作品解决了什么问题。"
            disabled={pending}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <ChipInput
            label="标签"
            hint="按 Enter 或点击添加；会自动去重、忽略空值"
            values={form.tags}
            inputValue={tagInput}
            placeholder="作品集"
            pending={pending}
            onInputChange={setTagInput}
            onAdd={() => {
              addListItem("tags", tagInput);
              setTagInput("");
            }}
            onKeyDown={(event) =>
              handleListKeyDown(event, "tags", tagInput, () => setTagInput(""))
            }
            onRemove={(value) => removeListItem("tags", value)}
          />
          <ChipInput
            label="技术栈"
            hint="按展示顺序添加，首页最多显示前几项"
            values={form.techStack}
            inputValue={techStackInput}
            placeholder="Next.js"
            pending={pending}
            onInputChange={setTechStackInput}
            onAdd={() => {
              addListItem("techStack", techStackInput);
              setTechStackInput("");
            }}
            onKeyDown={(event) =>
              handleListKeyDown(event, "techStack", techStackInput, () =>
                setTechStackInput("")
              )
            }
            onRemove={(value) => removeListItem("techStack", value)}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="源码链接" hint="可选，必须以 https:// 开头">
            <input
              value={form.repoUrl ?? ""}
              onChange={(event) => {
                setLocalError(null);
                setForm((current) => ({
                  ...current,
                  repoUrl: event.target.value,
                }));
              }}
              className="admin-input"
              placeholder="https://github.com/..."
              disabled={pending}
            />
          </Field>
          <Field label="备用访问链接" hint="可选，用于 iframe 加载失败时备用访问">
            <input
              value={form.fallbackUrl ?? ""}
              onChange={(event) => {
                setLocalError(null);
                setForm((current) => ({
                  ...current,
                  fallbackUrl: event.target.value,
                }));
              }}
              className="admin-input"
              placeholder="https://..."
              disabled={pending}
            />
          </Field>
        </div>

        <ToggleCard
          title="首页精选"
          description="允许多个精选记录；首页会从排序后的精选记录里选第一个。"
        >
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isFeatured: event.target.checked,
              }))
            }
            disabled={pending}
          />
        </ToggleCard>
      </section>

      <Field label="展示模式" hint="当前真实活体网页展示请选择 iframe">
        <select
          value={form.coverMode}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              coverMode: event.target.value as SitePayload["coverMode"],
            }))
          }
          className="admin-input"
          disabled={pending}
        >
          <option value="iframe">iframe</option>
          <option value="text">text</option>
          <option value="gallery">gallery</option>
        </select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <ToggleCard
          title="公开展示"
          description="开启后，这个站点会出现在首页作品集里。"
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
            disabled={pending}
          />
        </ToggleCard>
        <ToggleCard
          title="允许交互模式"
          description="开启后，前台卡片可以进入可点击的 iframe 交互状态。"
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
            disabled={pending}
          />
        </ToggleCard>
      </div>

      {isEditModeWithoutSelection ? (
        <div className="border border-[var(--line)] bg-[#f7d879] p-4 text-sm leading-6 text-[var(--ink)]">
          先在站点列表里点击“编辑”，再修改并提交当前站点。
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || isEditModeWithoutSelection}
        className="border border-[var(--line)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[var(--green)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "保存中..." : mode === "create" ? "创建站点" : "更新站点"}
      </button>
    </form>
  );
}

function ChipInput({
  label,
  hint,
  values,
  inputValue,
  placeholder,
  pending,
  onInputChange,
  onAdd,
  onKeyDown,
  onRemove,
}: {
  label: string;
  hint: string;
  values: string[];
  inputValue: string;
  placeholder: string;
  pending: boolean;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onRemove: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2 text-sm text-[var(--ink)]">
      <div>
        <span className="block font-semibold text-[var(--ink)]">{label}</span>
        <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">
          {hint}
        </span>
      </div>
      <div className="flex min-w-0 gap-2">
        <input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="admin-input min-w-0 flex-1"
          placeholder={placeholder}
          disabled={pending}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={pending || !inputValue.trim()}
          className="border border-[var(--line)] bg-[#e7eadf] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[#f7d879] disabled:cursor-not-allowed disabled:opacity-50"
        >
          添加
        </button>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRemove(value)}
              disabled={pending}
              className="border border-[var(--line)] bg-[#f7d879] px-2.5 py-1 text-xs font-semibold text-[var(--ink)] transition hover:bg-[#f6ded7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {value} x
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
    <label className="block min-w-0 space-y-2 text-sm text-[var(--ink)]">
      <span className="block font-semibold text-[var(--ink)]">{label}</span>
      {hint ? (
        <span className="block text-xs leading-5 text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
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
    <label className="flex items-start gap-3 border border-[var(--line)] bg-[#fffdf7] p-4 text-sm text-[var(--ink)]">
      <span className="pt-1">{children}</span>
      <span className="block">
        <span className="block font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
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
    summary: initialSite.summary,
    tags: initialSite.tags,
    techStack: initialSite.techStack,
    isFeatured: initialSite.isFeatured,
    repoUrl: initialSite.repoUrl,
    fallbackUrl: initialSite.fallbackUrl,
    coverMode: initialSite.coverMode,
    sortOrder: initialSite.sortOrder,
    isVisible: initialSite.isVisible,
    allowInteraction: initialSite.allowInteraction,
  };
}

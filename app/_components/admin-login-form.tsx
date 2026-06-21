"use client";

import { FormEvent, useState } from "react";

interface AdminLoginFormProps {
  message: string;
  onSubmitPassword: (password: string) => Promise<void>;
}

export function AdminLoginForm({
  message,
  onSubmitPassword,
}: AdminLoginFormProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState(message);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setLocalMessage("请输入管理员密码。");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmitPassword(password);
      setLocalMessage("正在进入管理页面。");
      setPassword("");
    } catch (error) {
      setLocalMessage(getLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20"
    >
      <div>
        <label
          htmlFor="admin-password"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          管理员密码
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
          placeholder="请输入密码"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "校验中..." : "进入管理"}
      </button>
      <p className="text-sm leading-6 text-slate-400">{localMessage}</p>
    </form>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "Invalid password") {
    return "密码不正确。";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "管理员登录失败。";
}

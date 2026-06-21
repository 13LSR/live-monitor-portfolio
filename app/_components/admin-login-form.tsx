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
    <div className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5 shadow-[8px_8px_0_rgba(31,37,35,0.2)]"
      >
        <label
          htmlFor="admin-password"
          className="block text-sm font-semibold text-[var(--ink)]"
        >
          管理员密码
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="admin-input mt-3"
          placeholder="请输入密码"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full border border-[var(--line)] bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[var(--green)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "校验中..." : "进入管理"}
        </button>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {localMessage}
        </p>
      </form>
    </div>
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

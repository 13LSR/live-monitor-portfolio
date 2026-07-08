"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Input } from "animal-island-ui";
import { getFriendlyApiErrorMessage } from "@/app/_lib/api-errors";

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
      <Card
        color="warm-peach-pink"
        pattern="warm-peach-pink"
        className="w-full max-w-sm"
      >
        <form onSubmit={handleSubmit} className="p-5">
          <label
            htmlFor="admin-password"
            className="block text-sm font-semibold text-[var(--ink)]"
          >
            管理员密码
          </label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-3 w-full"
            placeholder="请输入密码"
            shadow
          />
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            block
            loading={submitting}
            disabled={submitting}
            className="mt-4"
          >
            {submitting ? "校验中..." : "进入管理"}
          </Button>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            {localMessage}
          </p>
        </form>
      </Card>
    </div>
  );
}

function getLoginErrorMessage(error: unknown) {
  return getFriendlyApiErrorMessage(error, "管理员登录失败。");
}

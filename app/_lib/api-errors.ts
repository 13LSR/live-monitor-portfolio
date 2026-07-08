const errorMessageMap = new Map<string, string>([
  ["Unauthorized", "登录已过期，请重新登录。"],
  ["Invalid password", "密码不正确，请重新输入。"],
  ["Site name is required", "请填写站点名称。"],
  ["Site slug is required", "请填写站点 slug。"],
  ["Site URL is required", "请填写网站地址。"],
  ["Site URL must start with https://", "网站地址必须以 https:// 开头。"],
  ["Site URL must be a valid absolute URL", "请输入有效的 https:// 网站地址。"],
  ["Failed to create site", "创建站点失败，请稍后再试。"],
  ["Failed to update site", "更新站点失败，请稍后再试。"],
  ["Failed to delete site", "删除站点失败，请稍后再试。"],
  ["Failed to seed default site", "初始化站点失败，请稍后再试。"],
]);

export function getFriendlyApiErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (message && errorMessageMap.has(message)) {
    return errorMessageMap.get(message)!;
  }

  if (isDuplicateSlugError(message)) {
    return "这个 slug 已经被使用，请换一个。";
  }

  if (isNetworkError(error, message)) {
    return "网络暂时不可用，请稍后再试。";
  }

  return message || fallback;
}

function isDuplicateSlugError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("duplicate slug") ||
    normalized.includes("unique constraint") ||
    normalized.includes("sites.slug")
  );
}

function isNetworkError(error: unknown, message: string) {
  return (
    error instanceof TypeError ||
    message === "Failed to fetch" ||
    message.includes("NetworkError")
  );
}

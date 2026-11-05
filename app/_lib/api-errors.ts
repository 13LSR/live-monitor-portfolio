const errorMessageMap = new Map<string, string>([
  ["Unauthorized", "登录已过期，请重新登录。"],
  ["Invalid password", "密码不正确，请重新输入。"],
  ["Invalid password format", "请输入有效的管理员密码。"],
  ["Too many login attempts", "尝试次数过多，请在 10 分钟后重试。"],
  ["Origin not allowed", "当前访问地址未获授权，请使用已配置的管理入口。"],
  ["Authentication is not configured", "管理入口尚未完成配置。"],
  ["Login temporarily unavailable", "登录服务暂时不可用，请稍后重试。"],
  ["Service temporarily unavailable", "服务暂时不可用，请稍后重试。"],
  ["Invalid JSON body", "提交的数据格式不正确，请刷新后重试。"],
  ["Request body is too large", "提交内容过长，请精简后重试。"],
  ["Site name is required", "请填写站点名称。"],
  ["Site slug is required", "请填写站点 slug。"],
  ["Site URL is required", "请填写网站地址。"],
  ["Site URL must start with https://", "网站地址必须以 https:// 开头。"],
  ["Site URL must be a valid absolute URL", "请输入有效的 https:// 网站地址。"],
  ["Failed to create site", "创建站点失败，请稍后再试。"],
  ["Failed to update site", "更新站点失败，请稍后再试。"],
  ["Failed to delete site", "删除站点失败，请稍后再试。"],
  ["Failed to seed default site", "初始化站点失败，请稍后再试。"],
  ["Cover URL must be a valid http(s) image URL", "请输入有效的 http:// 或 https:// 封面图片链接。"],
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

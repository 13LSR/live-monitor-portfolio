import type { SitePayload } from "../../shared/contracts";
import type { SiteRecord } from "../../shared/types";
import { buildSitePayloadForSubmit } from "./site-form-utils.ts";

export function verifySavedSite(sites: SiteRecord[], payload: SitePayload, id?: number) {
  const expected = buildSitePayloadForSubmit(payload);
  const saved = sites.find((site) => id === undefined ? site.slug === expected.slug : site.id === id);
  if (!saved) throw new Error("保存后未读取到该站点，请刷新列表核对。表单内容已保留。");
  if (!("coverUrl" in saved)) {
    throw new Error("当前后台服务尚未支持封面保存，请更新 Worker 后重试。表单内容已保留。");
  }
  if (payload.architecture !== undefined && !("architecture" in saved)) {
    throw new Error("当前后台服务尚未支持架构资料，请更新 Worker 后重试。表单内容已保留。");
  }
  for (const key of Object.keys(expected) as (keyof SitePayload)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(expected[key])) {
      throw new Error("保存后的资料与填写内容不一致，请检查后台服务版本后重试。表单内容已保留。");
    }
  }
  return saved;
}

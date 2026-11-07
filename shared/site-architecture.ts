export const ARCHITECTURE_KINDS = {
  client: "访问端", frontend: "前端", backend: "后端", data: "数据存储", service: "外部服务",
} as const;
export interface ArchitectureNode {
  id: string;
  label: string;
  kind: keyof typeof ARCHITECTURE_KINDS;
  technology: string;
  description: string;
}
export interface ArchitectureEdge { from: string; to: string; label: string }
export interface SiteArchitecture {
  overview: string;
  frontend: string;
  backend: string;
  database: string;
  deployment: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
export const ARCHITECTURE_SECTIONS = {
  overview: "实现概述", frontend: "前端说明", backend: "后端说明", database: "数据库说明", deployment: "运行平台",
} as const;
export function emptyArchitecture(): SiteArchitecture {
  return { overview: "", frontend: "", backend: "", database: "", deployment: "", nodes: [], edges: [] };
}
export function getArchitectureError(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "架构资料格式不正确。";
  const item = value as Record<string, unknown>;
  for (const key of Object.keys(ARCHITECTURE_SECTIONS)) {
    if (typeof item[key] !== "string" || item[key].length > 1600) return "架构说明须为文本，每项最多 1600 字。";
  }
  if (!Array.isArray(item.nodes) || item.nodes.length > 12 || !Array.isArray(item.edges) || item.edges.length > 24) return "架构最多包含 12 个组件、24 条连接。";
  const ids = new Set<string>();
  for (const node of item.nodes) {
    if (!node || typeof node !== "object" || typeof node.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(node.id) || ids.has(node.id)) return "架构组件标识无效或重复。";
    if (typeof node.label !== "string" || !node.label.trim() || node.label.length > 80) return "请填写组件名称（最多 80 字）。";
    if (typeof node.kind !== "string" || !Object.hasOwn(ARCHITECTURE_KINDS, node.kind)) return "请选择有效的组件类型。";
    if (typeof node.technology !== "string" || node.technology.length > 160 || typeof node.description !== "string" || node.description.length > 500) return "组件技术栈最多 160 字，职责说明最多 500 字。";
    ids.add(node.id);
  }
  const connections = new Set<string>();
  for (const edge of item.edges) {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || typeof edge.label !== "string" || edge.label.length > 80) return "连接需要两个不同的已有组件，说明最多 80 字。";
    const pair = `${edge.from}:${edge.to}`;
    if (connections.has(pair)) return "同一方向的组件连接不能重复。";
    connections.add(pair);
  }
  return null;
}
export function normalizeArchitecture(value: SiteArchitecture | null | undefined): SiteArchitecture | null {
  if (!value) return null;
  const result: SiteArchitecture = {
    overview: value.overview.trim(), frontend: value.frontend.trim(), backend: value.backend.trim(),
    database: value.database.trim(), deployment: value.deployment.trim(),
    nodes: value.nodes.map((node) => ({ id: node.id, label: node.label.trim(), kind: node.kind, technology: node.technology.trim(), description: node.description.trim() })),
    edges: value.edges.map((edge) => ({ from: edge.from, to: edge.to, label: edge.label.trim() })),
  };
  return Object.keys(ARCHITECTURE_SECTIONS).some((key) => result[key as keyof typeof ARCHITECTURE_SECTIONS]) || result.nodes.length ? result : null;
}
export function parseArchitecture(value: string | null | undefined): SiteArchitecture | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return getArchitectureError(parsed) ? null : normalizeArchitecture(parsed as SiteArchitecture | null);
  } catch { return null; }
}
// Semantic columns remain readable even when connections form cycles.
export function layoutArchitecture(nodes: ArchitectureNode[]) {
  const kinds = Object.keys(ARCHITECTURE_KINDS).filter((kind) => nodes.some((node) => node.kind === kind));
  const rows = new Map<string, number>();
  const positioned = nodes.map((node) => {
    const row = rows.get(node.kind) ?? 0;
    rows.set(node.kind, row + 1);
    return { ...node, x: 24 + kinds.indexOf(node.kind) * 218, y: 44 + row * 128 };
  });
  return { nodes: positioned, width: Math.max(266, kinds.length * 218 + 24), height: Math.max(176, ...[...rows.values()].map((rows) => rows * 128 + 56)) };
}

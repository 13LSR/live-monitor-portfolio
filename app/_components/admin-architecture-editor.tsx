"use client";

import { ARCHITECTURE_KINDS, ARCHITECTURE_SECTIONS, emptyArchitecture, type ArchitectureNode, type SiteArchitecture } from "@/shared/site-architecture";
import { ArchitectureDetails } from "./architecture-details";

export function AdminArchitectureEditor({ value, onChange, pending }: {
  value: SiteArchitecture | null;
  onChange: (value: SiteArchitecture | null) => void;
  pending: boolean;
}) {
  const architecture = value ?? emptyArchitecture();
  const patchNode = (id: string, patch: Partial<ArchitectureNode>) => onChange({ ...architecture, nodes: architecture.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) });
  const availablePair = architecture.nodes.flatMap((from) => architecture.nodes.map((to) => ({ from: from.id, to: to.id, label: "" })))
    .find((edge) => edge.from !== edge.to && !architecture.edges.some((existing) => existing.from === edge.from && existing.to === edge.to));
  return <fieldset className="admin-editor__section admin-architecture" disabled={pending}>
    <legend>架构详情</legend>
    <p className="admin-architecture__hint">填写后，作品卡片会出现「架构详情」。组件和连接自动生成图；只填写实际使用的技术。</p>
    <div className="admin-architecture__notes">{Object.entries(ARCHITECTURE_SECTIONS).map(([key, label]) => <label key={key}>
      <span>{label}</span><textarea className="admin-input" rows={3} maxLength={1600} value={architecture[key as keyof typeof ARCHITECTURE_SECTIONS]}
        onChange={(event) => onChange({ ...architecture, [key]: event.currentTarget.value })} />
    </label>)}</div>
    <div className="admin-architecture__heading"><h3>组件 · {architecture.nodes.length}/12</h3><button type="button" disabled={pending || architecture.nodes.length >= 12}
      onClick={() => onChange({ ...architecture, nodes: [...architecture.nodes, { id: crypto.randomUUID(), label: `组件 ${architecture.nodes.length + 1}`, kind: "frontend", technology: "", description: "" }] })}>添加组件</button></div>
    {architecture.nodes.map((node) => <div className="admin-architecture__node" key={node.id}>
      <label><span>组件名称</span><input className="admin-input" maxLength={80} value={node.label} onChange={(event) => patchNode(node.id, { label: event.currentTarget.value })} /></label>
      <label><span>组件类型</span><select className="admin-input" value={node.kind} onChange={(event) => patchNode(node.id, { kind: event.currentTarget.value as ArchitectureNode["kind"] })}>
        {Object.entries(ARCHITECTURE_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label><span>技术栈（逗号分隔）</span><input className="admin-input" maxLength={160} value={node.technology} placeholder="React, Next.js" onChange={(event) => patchNode(node.id, { technology: event.currentTarget.value })} /></label>
      <label><span>组件职责</span><textarea className="admin-input" rows={2} maxLength={500} value={node.description} onChange={(event) => patchNode(node.id, { description: event.currentTarget.value })} /></label>
      <button type="button" onClick={() => onChange({ ...architecture, nodes: architecture.nodes.filter((item) => item.id !== node.id), edges: architecture.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id) })}>移除组件</button>
    </div>)}
    <div className="admin-architecture__heading"><h3>连接 · {architecture.edges.length}/24</h3><button type="button" disabled={pending || !availablePair || architecture.edges.length >= 24}
      onClick={() => { if (availablePair) onChange({ ...architecture, edges: [...architecture.edges, availablePair] }); }}>添加连接</button></div>
    {architecture.edges.map((edge, index) => <div className="admin-architecture__edge" key={index}>
      {(["from", "to"] as const).map((field) => <label key={field}><span>{field === "from" ? "来源组件" : "目标组件"}</span><select className="admin-input" value={edge[field]}
        onChange={(event) => { const next = event.currentTarget.value; onChange({ ...architecture, edges: architecture.edges.map((item, at) => at === index ? { ...item, [field]: next } : item) }); }}>
        {architecture.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
      </select></label>)}
      <label><span>连接说明</span><input className="admin-input" maxLength={80} value={edge.label} placeholder="HTTPS 请求 / 读取数据"
        onChange={(event) => { const next = event.currentTarget.value; onChange({ ...architecture, edges: architecture.edges.map((item, at) => at === index ? { ...item, label: next } : item) }); }} /></label>
      <button type="button" aria-label={`移除第 ${index + 1} 条连接`} onClick={() => onChange({ ...architecture, edges: architecture.edges.filter((_, at) => at !== index) })}>移除</button>
    </div>)}
    <details className="admin-architecture__preview"><summary>预览架构详情</summary><ArchitectureDetails value={architecture} /></details>
  </fieldset>;
}

"use client";

import { useId } from "react";
import { ARCHITECTURE_KINDS, ARCHITECTURE_SECTIONS, layoutArchitecture, type SiteArchitecture } from "@/shared/site-architecture";
import { TechStackLabel } from "./tech-stack-label";

export function ArchitectureDetails({ value }: { value: SiteArchitecture }) {
  const markerId = useId().replace(/:/g, "");
  const layout = layoutArchitecture(value.nodes);
  const abbreviate = (text: string, length: number) => text.length > length ? `${text.slice(0, length - 1)}…` : text;
  return <div className="architecture-details">
    {value.overview && <p className="architecture-overview">{value.overview}</p>}
    {layout.nodes.length > 0 && <div className="architecture-diagram" tabIndex={0} role="region" aria-label="架构图，可横向滚动；完整组件和连接说明见下方">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ minWidth: Math.min(layout.width, 760) }} role="img" aria-label="网站组件及数据流向">
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {value.edges.map((edge, index) => {
          const from = layout.nodes.find((node) => node.id === edge.from);
          const to = layout.nodes.find((node) => node.id === edge.to);
          if (!from || !to || from.id === to.id) return null;
          const forward = to.x > from.x;
          const sameColumn = to.x === from.x;
          const x1 = from.x + (forward || sameColumn ? 172 : 0);
          const x2 = to.x + (forward ? 0 : 172);
          const y1 = from.y + 46, y2 = to.y + 46;
          const bend = sameColumn ? 36 : Math.max(24, Math.abs(x2 - x1) / 2);
          const path = `M ${x1} ${y1} C ${x1 + (forward || sameColumn ? bend : -bend)} ${y1}, ${x2 + (forward ? -bend : bend)} ${y2}, ${x2} ${y2}`;
          return <path key={index} className="architecture-edge" d={path} markerEnd={`url(#${markerId})`}><title>{from.label} → {to.label}{edge.label && `：${edge.label}`}</title></path>;
        })}
        {layout.nodes.map((node) => <g key={node.id} transform={`translate(${node.x},${node.y})`}>
          <title>{node.label} · {node.technology}</title>
          <rect className={`architecture-node is-${node.kind}`} width="172" height="92" rx="8" />
          <text x="12" y="21" className="architecture-node__kind">{ARCHITECTURE_KINDS[node.kind]}</text>
          <text x="12" y="47" className="architecture-node__label">{abbreviate(node.label, 14)}</text>
          <text x="12" y="72" className="architecture-node__tech">{abbreviate(node.technology, 22)}</text>
        </g>)}
      </svg>
    </div>}
    {value.nodes.length > 0 && <div className="architecture-components">
      {value.nodes.map((node) => <section key={node.id}>
        <p className="architecture-caption">{ARCHITECTURE_KINDS[node.kind]}</p><h4>{node.label}</h4>
        <div className="architecture-technologies">{[...new Set(node.technology.split(/[,，、]/).map((tech) => tech.trim()).filter(Boolean))].map((tech) => <TechStackLabel key={tech} name={tech} />)}</div>
        {node.description && <p>{node.description}</p>}
      </section>)}
    </div>}
    {value.edges.length > 0 && <section><h4>连接与数据流</h4><ul className="architecture-connections">{value.edges.map((edge, index) => <li key={index}>
      <span>{value.nodes.find((node) => node.id === edge.from)?.label || "未选择"} → {value.nodes.find((node) => node.id === edge.to)?.label || "未选择"}</span>{edge.label && <small>{edge.label}</small>}
    </li>)}</ul></section>}
    <div className="architecture-notes">{Object.entries(ARCHITECTURE_SECTIONS).filter(([key]) => key !== "overview").map(([key, title]) => {
      const text = value[key as keyof typeof ARCHITECTURE_SECTIONS];
      return text ? <section key={key}><h4>{title}</h4><p>{text}</p></section> : null;
    })}</div>
  </div>;
}

import { getTechnology, type TechnologyIcon } from "@/shared/tech-stack";

function IconShape({ icon }: { icon?: TechnologyIcon }) {
  switch (icon) {
    case "react": return <g fill="none" stroke="currentColor" strokeWidth="1.4"><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /></g>;
    case "vue": return <><path fill="currentColor" d="M1 3h5l6 10 6-10h5L12 22Z" /><path fill="#35495e" d="M6 3h4l2 3 2-3h4l-6 10Z" /></>;
    case "next": return <><circle cx="12" cy="12" r="10.5" fill="currentColor" /><path d="M7 17V7l11 14M16 7v7" fill="none" stroke="white" strokeWidth="1.5" /></>;
    case "typescript": case "javascript": return <><rect x="1" y="1" width="22" height="22" rx="2" fill="currentColor" /><text x="12" y="18" fill="white" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{icon === "typescript" ? "TS" : "JS"}</text></>;
    case "node": return <><path fill="none" stroke="currentColor" strokeWidth="2" d="m12 1 9 5v12l-9 5-9-5V6Z" /><text x="12" y="16" fill="currentColor" fontSize="11" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">JS</text></>;
    case "tailwind": return <path fill="currentColor" d="M12 4C7 4 5 7 5 10c2-3 4-3 6-1 1 1 3 3 6 3 4 0 6-3 6-6-2 3-4 3-6 1-1-1-3-3-5-3ZM6 12c-4 0-6 3-6 6 2-3 4-3 6-1 1 1 3 3 6 3 4 0 6-3 6-6-2 3-4 3-6 1-1-1-3-3-6-3Z" />;
    case "three": return <path d="m3 2 18 6-13 14Zm0 0 11 13M21 8 5.5 12M8 22l2-17M5.5 12l8.5 3" stroke="currentColor" strokeWidth="1.2" fill="none" />;
    case "cloudflare": return <path fill="currentColor" d="M4 18a4 4 0 0 1-1-8 5 5 0 0 1 10-2 4 4 0 0 1 5 5 3 3 0 0 1 4 5ZM2 20h20v2H2Z" />;
    case "html": case "css": return <><path d="m3 2 1.5 18L12 22l7.5-2L21 2Z" fill="currentColor" /><text x="12" y="17" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="15" textAnchor="middle">{icon === "html" ? "5" : "3"}</text></>;
    case "python": return <><path fill="currentColor" d="M6 2h10v9H8v4H2V8h4Zm3 2v2h2V4Z" fillRule="evenodd" /><path fill="#c39720" d="M18 22H8v-9h8V9h6v7h-4Zm-3-2v-2h-2v2Z" fillRule="evenodd" /></>;
    case "docker": return <><path fill="currentColor" d="M2 12h18l3-3v5h-3c-1 6-5 8-10 8-5 0-8-3-8-10Z" /><path fill="none" stroke="currentColor" strokeWidth="3" d="M4 9h3m2 0h3m2 0h3M9 5h3m2 0h3m-3-4h3" /></>;
    case "git": return <><rect x="4" y="4" width="16" height="16" rx="2" transform="rotate(45 12 12)" fill="currentColor" /><path d="m8 5 8 8M10 7v10" stroke="white" strokeWidth="1.5" /><g fill="white"><circle cx="10" cy="8" r="2" /><circle cx="16" cy="13" r="2" /><circle cx="10" cy="17" r="2" /></g></>;
    default: return <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20" stroke="currentColor" strokeWidth="1.7" fill="none" />;
  }
}

export function TechStackLabel({ name }: { name: string }) {
  const tech = getTechnology(name);
  return <span className="tech-stack-label"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style={{ color: tech?.color }}><IconShape icon={tech?.icon} /></svg><span>{name}</span></span>;
}

const technologies = [
  { name: "React", icon: "react", aliases: ["reactjs", "react.js"], color: "#087e9b" },
  { name: "Next.js", icon: "next", aliases: ["next", "nextjs"], color: "#20242b" },
  { name: "Vue", icon: "vue", aliases: ["vuejs", "vue.js", "vue3", "vue 3"], color: "#16835d" },
  { name: "TypeScript", icon: "typescript", aliases: ["ts"], color: "#3178c6" },
  { name: "JavaScript", icon: "javascript", aliases: ["js"], color: "#826900" },
  { name: "Node.js", icon: "node", aliases: ["node", "nodejs"], color: "#43853d" },
  { name: "Tailwind CSS", icon: "tailwind", aliases: ["tailwind", "tailwindcss"], color: "#087f9c" },
  { name: "Three.js", icon: "three", aliases: ["three", "threejs"], color: "#414756" },
  { name: "Cloudflare", icon: "cloudflare", aliases: ["cloudflare workers", "cloudflare pages", "workers", "d1"], color: "#b9620c" },
  { name: "HTML", icon: "html", aliases: ["html5"], color: "#c54b24" },
  { name: "CSS", icon: "css", aliases: ["css3"], color: "#2965b5" },
  { name: "Python", icon: "python", aliases: ["py"], color: "#3776ab" },
  { name: "Docker", icon: "docker", aliases: [], color: "#1979b8" },
  { name: "Git", icon: "git", aliases: ["github"], color: "#d65134" },
] as const;

export type TechnologyIcon = (typeof technologies)[number]["icon"];
export const TECH_STACK_SUGGESTIONS = technologies.map((tech) => tech.name);

export function getTechnology(value: string) {
  const key = value.trim().toLowerCase();
  return technologies.find((tech) => tech.name.toLowerCase() === key || tech.aliases.some((alias) => alias === key));
}

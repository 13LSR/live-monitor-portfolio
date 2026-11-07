export type SceneQuality = "high" | "medium" | "low";
export type QualityMode = "auto" | SceneQuality;
export const QUALITY_LABELS: Record<QualityMode, string> = { auto: "自动", high: "高", medium: "中", low: "低" };
export const QUALITY_STORAGE_KEY = "portfolio.scene-quality";
export const QUALITY_SETTINGS = {
  high: { pixelRatio: 1.5, reflectionSize: 768, bloom: true, starFraction: 1 },
  medium: { pixelRatio: 1, reflectionSize: 384, bloom: false, starFraction: .65 },
  low: { pixelRatio: .75, reflectionSize: 0, bloom: false, starFraction: .35 },
} as const;
export function isQualityMode(value: unknown): value is QualityMode {
  return value === "auto" || value === "high" || value === "medium" || value === "low";
}

export function createQualityController(compact: boolean, initial: QualityMode, changed: (quality: SceneQuality, mode: QualityMode) => void) {
  const levels: SceneQuality[] = ["low", "medium", "high"];
  let mode = initial;
  let quality: SceneQuality = mode === "auto" ? compact ? "medium" : "high" : mode;
  let elapsed = 0, frames = 0, slowWindows = 0, fastWindows = 0;
  let warmup = 3000, cooldown = 0;
  const reset = () => { elapsed = 0; frames = 0; slowWindows = 0; fastWindows = 0; warmup = 3000; };
  const change = (next: SceneQuality) => { quality = next; reset(); cooldown = 30_000; changed(quality, mode); };
  return {
    get quality() { return quality; },
    get mode() { return mode; },
    reset,
    setMode(next: QualityMode) {
      if (!isQualityMode(next) || mode === next) return;
      mode = next;
      reset();
      if (next !== "auto") change(next); else { cooldown = 0; changed(quality, mode); }
    },
    sample(milliseconds: number) {
      if (mode !== "auto") return;
      // Loading stalls and background-tab gaps are not sustained rendering speed.
      if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 1000) { reset(); return; }
      cooldown = Math.max(0, cooldown - milliseconds);
      if (warmup > 0) { warmup -= milliseconds; return; }
      elapsed += milliseconds;
      frames++;
      if (elapsed < 2000) return;
      const average = elapsed / frames;
      slowWindows = average > 24 ? slowWindows + 1 : 0;
      fastWindows = average < 17.5 ? fastWindows + 1 : 0;
      elapsed = 0; frames = 0;
      const at = levels.indexOf(quality);
      if (slowWindows >= 2 && at > 0 && (cooldown === 0 || average > 45)) change(levels[at - 1]);
      else if (fastWindows >= 10 && cooldown === 0 && at < (compact ? 1 : 2)) change(levels[at + 1]);
    },
  };
}

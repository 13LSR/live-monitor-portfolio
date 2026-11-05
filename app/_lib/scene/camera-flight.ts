export type SceneView = "home" | "works" | "about";

// Zero velocity and acceleration at both ends avoids an abrupt camera stop.
export function flightProgress(elapsed: number, duration = 1.65) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function usePageVisibility() {
  return useSyncExternalStore(subscribe, () => !document.hidden, () => false);
}

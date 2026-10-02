import { useSyncExternalStore } from "react";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "../lib/motion";

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return prefersReducedMotion();
}

function getServerSnapshot() {
  return false;
}

/** Reactive reduced-motion preference (SSR-safe). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

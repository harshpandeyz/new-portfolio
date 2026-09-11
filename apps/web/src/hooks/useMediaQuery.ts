import { useMemo, useSyncExternalStore } from "react";

function serverSnapshot() {
  return false;
}

/** Reactive media-query hook, e.g. useMediaQuery("(max-width: 768px)"). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useMemo(
    () => (callback: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    [query],
  );
  const snapshot = useMemo(
    () => () => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
      return window.matchMedia(query).matches;
    },
    [query],
  );
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

import { useSyncExternalStore } from "react";

function makeSubscribe(query: string) {
  return (callback: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  };
}

function makeSnapshot(query: string) {
  return () => window.matchMedia(query).matches;
}

function serverSnapshot() {
  return false;
}

/** Reactive media-query hook, e.g. useMediaQuery("(max-width: 768px)"). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(makeSubscribe(query), makeSnapshot(query), serverSnapshot);
}

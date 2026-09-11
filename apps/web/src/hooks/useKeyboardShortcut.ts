import { useEffect, useRef } from "react";

/** Effect that runs `handler` when the given key(s) are pressed. */
export function useKeyboardShortcut(
  keys: string[],
  handler: () => void,
  enabled = true,
  { preventDefault = true }: { preventDefault?: boolean } = {},
) {
  const handlerRef = useRef(handler);
  const keysRef = useRef(keys);

  useEffect(() => {
    handlerRef.current = handler;
    keysRef.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!keysRef.current.includes(e.key) && !keysRef.current.includes(e.code)) return;
      // Don't hijack typing: arrows/spaces in inputs should edit, not navigate.
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (inField) return;
      if (preventDefault) e.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, preventDefault]);
}

import { useEffect } from "react";

/** Effect that runs `handler` when the given key(s) are pressed. */
export function useKeyboardShortcut(
  keys: string[],
  handler: () => void,
  enabled = true,
  { preventDefault = true }: { preventDefault?: boolean } = {},
) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (keys.includes(e.key) || keys.includes(e.code)) {
        if (preventDefault) e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keys, handler, enabled, preventDefault]);
}

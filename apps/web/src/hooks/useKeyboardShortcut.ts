import { useEffect, useRef } from "react";

/** Effect that runs `handler` when the given key(s) are pressed. */
export function useKeyboardShortcut(
  keys: string[],
  handler: () => void,
  enabled = true,
  { preventDefault = true }: { preventDefault?: boolean } = {},
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const keysRef = useRef(keys);
  keysRef.current = keys;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (keysRef.current.includes(e.key) || keysRef.current.includes(e.code)) {
        if (preventDefault) e.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, preventDefault]);
}

import { useEffect, useRef } from "react";

export function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"),
  );
}

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
      if (isEditableTarget(e.target)) return;
      if (preventDefault) e.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, preventDefault]);
}

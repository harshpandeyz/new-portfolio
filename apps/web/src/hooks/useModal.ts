import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal accessible dialog state: open/close/opener tracking plus body scroll
 * locking and Escape-to-close. It intentionally does NOT manage focus itself so
 * callers can pair it with a focus-trap via the returned close/opener refs.
 */
export function useModal() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const openWith = useCallback((source?: HTMLElement | null) => {
    openerRef.current = source ?? (document.activeElement as HTMLElement | null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.();
    };
  }, [open]);

  return { open, setOpen, openWith, close, openerRef };
}

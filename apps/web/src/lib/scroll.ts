import { useEffect, useRef, useState } from "react";

/** Tracks the active section for the subtle 3D scene and translucent navigation. */
export function useScrollPosition(sectionIds: readonly string[]) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const raf = useRef(0);
  const idsRef = useRef(sectionIds);
  idsRef.current = sectionIds;

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        const mid = window.scrollY + window.innerHeight * 0.4;
        let index = 0;
        idsRef.current.forEach((id, i) => {
          const element = document.getElementById(id);
          if (element && element.offsetTop <= mid) index = i;
        });
        setSectionIndex(index);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf.current); };
  }, []);

  return { sectionIndex, scrolled };
}

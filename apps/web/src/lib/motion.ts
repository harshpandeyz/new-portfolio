import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { EnvCapabilities } from "./device";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Level-1 reveal: subtle opacity + translation for elements with [data-reveal]. */
export function bindReveals(scope: HTMLElement | Document, caps: EnvCapabilities): ScrollTrigger[] {
  if (caps.reducedMotion) {
    scope.querySelectorAll?.("[data-reveal]").forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
      (el as HTMLElement).style.transform = "none";
    });
    return [];
  }
  const triggers: ScrollTrigger[] = [];
  scope.querySelectorAll?.("[data-reveal]").forEach((el) => {
    const htmlEl = el as HTMLElement;
    gsap.set(htmlEl, { opacity: 0, y: 28 });
    const trigger = ScrollTrigger.create({
      trigger: htmlEl,
      start: "top 88%",
      once: true,
      onEnter: () => {
        gsap.to(htmlEl, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: Number(htmlEl.dataset.revealDelay ?? 0),
          clearProps: "transform",
        });
      },
    });
    triggers.push(trigger);
  });
  return triggers;
}

export function killTriggers(triggers: ScrollTrigger[]): void {
  triggers.forEach((t) => t.kill());
}

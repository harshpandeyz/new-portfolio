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

/** Level-2 text choreography for section titles (split by word). */
export function splitReveal(el: HTMLElement, caps: EnvCapabilities): void {
  if (caps.reducedMotion) return;
  const text = el.textContent ?? "";
  const words = text.split(" ");
  el.innerHTML = words
    .map((w) => `<span class="w" style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">${w}&nbsp;</span></span>`)
    .join("");
  const inners = el.querySelectorAll(".w > span");
  gsap.set(inners, { yPercent: 110 });
  ScrollTrigger.create({
    trigger: el,
    start: "top 86%",
    once: true,
    onEnter: () => {
      gsap.to(inners, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.06 });
    },
  });
}

export function killTriggers(triggers: ScrollTrigger[]): void {
  triggers.forEach((t) => t.kill());
}

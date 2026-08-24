/** Device capability tiering for the 3D/animation system. */

export type Tier = "high" | "medium" | "low";

export interface EnvCapabilities {
  tier: Tier;
  reducedMotion: boolean;
  webgl: boolean;
  mobile: boolean;
  cores: number;
}

export function detectCapabilities(): EnvCapabilities {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;

  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }

  const lowPower = (cores <= 4 && mobile) || cores <= 2 || (navigator as { deviceMemory?: number }).deviceMemory === undefined && mobile;

  let tier: Tier = "high";
  if (!webgl || reducedMotion) tier = "low";
  else if (mobile || lowPower) tier = "medium";

  return { tier, reducedMotion, webgl, mobile, cores };
}

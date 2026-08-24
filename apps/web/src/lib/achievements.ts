import { ACHIEVEMENTS } from "@hp/shared";

const KEY = "hp_os_achievements";
const listeners = new Set<(unlocked: string[]) => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(ids));
}

export function getAchievements(): string[] {
  return read();
}

export function isUnlocked(id: string): boolean {
  return read().includes(id);
}

export function onAchievements(fn: (unlocked: string[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Unlocks an achievement; returns true if it was newly unlocked. */
export function unlock(id: string): boolean {
  const current = read();
  if (current.includes(id)) return false;
  if (!ACHIEVEMENTS.some((a) => a.id === id)) return false;
  write([...current, id]);
  return true;
}

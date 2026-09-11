import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@hp/shared";

import { getAchievements, onAchievements } from "../../lib/achievements";

interface Toast {
  id: string;
  title: string;
  desc: string;
  leaving: boolean;
}

export function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // onAchievements only fires on write(), so there is no initial burst for
    // pre-existing unlocks — every callback here is a fresh unlock worth toasting.
    // Toast only the newly added id to avoid re-toasting the whole list.
    let lastSeen = new Set<string>(getAchievements());
    const timers: number[] = [];
    const unsub = onAchievements((unlocked) => {
      const fresh = unlocked.filter((id) => !lastSeen.has(id));
      lastSeen = new Set(unlocked);
      const latest = fresh[fresh.length - 1] ?? unlocked[unlocked.length - 1];
      if (!latest) return;
      // If nothing is actually new (e.g. duplicate write), stay quiet.
      if (fresh.length === 0) return;
      const def = ACHIEVEMENTS.find((a) => a.id === latest);
      if (!def) return;
      const toast: Toast = { id: `${def.id}-${Date.now()}`, title: def.title, desc: def.description, leaving: false };
      setToasts((t) => [...t.slice(-2), toast]);
      timers.push(window.setTimeout(() => {
        setToasts((t) => t.map((x) => (x.id === toast.id ? { ...x, leaving: true } : x)));
        timers.push(window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 350));
      }, 3600));
    });
    return () => {
      unsub();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast${t.leaving ? " out" : ""}`} key={t.id}>
          <span className="toast-icon">◈</span>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-desc">{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

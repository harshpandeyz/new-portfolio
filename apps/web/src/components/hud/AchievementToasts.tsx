import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@hp/shared";

import { onAchievements } from "../../lib/achievements";

interface Toast {
  id: string;
  title: string;
  desc: string;
  leaving: boolean;
}

export function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seen = false;
    return onAchievements((unlocked) => {
      if (!seen) {
        // don't toast for pre-existing unlocks on load
        seen = true;
        return;
      }
      const latest = unlocked[unlocked.length - 1];
      const def = ACHIEVEMENTS.find((a) => a.id === latest);
      if (!def) return;
      const toast: Toast = { id: `${def.id}-${Date.now()}`, title: def.title, desc: def.description, leaving: false };
      setToasts((t) => [...t.slice(-2), toast]);
      window.setTimeout(() => {
        setToasts((t) => t.map((x) => (x.id === toast.id ? { ...x, leaving: true } : x)));
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 350);
      }, 3600);
    });
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

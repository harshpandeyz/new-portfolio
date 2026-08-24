import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Profile, Project, Certificate, Skill, Education, TimelineItem, SystemStats } from "@hp/shared";

import { api } from "./api";

interface DataState {
  profile: Profile | null;
  projects: Project[];
  certificates: Certificate[];
  certTotal: number;
  skills: Skill[];
  education: Education[];
  timeline: TimelineItem[];
  stats: SystemStats | null;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataState>({
  profile: null, projects: [], certificates: [], certTotal: 0, skills: [],
  education: [], timeline: [], stats: null, loaded: false, error: null,
  refresh: async () => undefined,
});

export function useData(): DataState {
  return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    profile: null, projects: [], certificates: [], certTotal: 0, skills: [],
    education: [], timeline: [], stats: null, loaded: false, error: null,
    refresh: async () => undefined,
  });

  async function load() {
    try {
      const [profileRes, projectsRes, certRes, skillsRes, eduRes, tlRes, statsRes] = await Promise.all([
        api.profile(), api.projects(), api.certificates(), api.skills(), api.education(), api.timeline(), api.stats(),
      ]);
      setState((s) => ({
        profile: profileRes.profile,
        projects: projectsRes.projects,
        certificates: certRes.certificates,
        certTotal: certRes.total,
        skills: skillsRes.skills,
        education: eduRes.items,
        timeline: tlRes.items,
        stats: statsRes,
        loaded: true,
        error: null,
        refresh: load,
      }));
    } catch (err) {
      setState((s) => ({ ...s, loaded: true, error: err instanceof Error ? err.message : "System offline" }));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return <DataContext.Provider value={{ ...state, refresh: load }}>{children}</DataContext.Provider>;
}

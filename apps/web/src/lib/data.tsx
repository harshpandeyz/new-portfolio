import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

  const loadRef = useRef<() => Promise<void>>(undefined!);

  async function load() {
    const critical = await Promise.allSettled([api.profile(), api.projects()]);
    const criticalValue = <T,>(index: number): T | undefined => {
      const result = critical[index];
      return result?.status === "fulfilled" ? result.value as T : undefined;
    };
    setState((s) => ({
      ...s,
      profile: criticalValue<{ profile: Profile }>(0)?.profile ?? s.profile,
      projects: criticalValue<{ projects: Project[] }>(1)?.projects ?? s.projects,
      loaded: true,
      error: critical.some((result) => result.status === "rejected") ? "Some content is temporarily unavailable." : null,
      refresh: loadRef.current,
    }));

    // Non-critical content arrives after the first useful paint. Stats remain
    // admin-only and are intentionally not requested by the public shell.
    const deferred = await Promise.allSettled([api.certificates(), api.skills(), api.education(), api.timeline()]);
    const deferredValue = <T,>(index: number): T | undefined => {
      const result = deferred[index];
      return result?.status === "fulfilled" ? result.value as T : undefined;
    };
    setState((s) => ({
      ...s,
      certificates: deferredValue<{ certificates: Certificate[] }>(0)?.certificates ?? s.certificates,
      certTotal: deferredValue<{ total: number }>(0)?.total ?? s.certTotal,
      skills: deferredValue<{ skills: Skill[] }>(1)?.skills ?? s.skills,
      education: deferredValue<{ items: Education[] }>(2)?.items ?? s.education,
      timeline: deferredValue<{ items: TimelineItem[] }>(3)?.items ?? s.timeline,
      error: [...critical, ...deferred].some((result) => result.status === "rejected") ? "Some content is temporarily unavailable." : null,
      refresh: loadRef.current,
    }));
  }

  loadRef.current = load;

  useEffect(() => {
    void load();
  }, []);

  return <DataContext.Provider value={{ ...state, refresh: load }}>{children}</DataContext.Provider>;
}

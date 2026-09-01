import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certTotal, setCertTotal] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Cancel any in-flight requests from a previous load cycle.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    const critical = await Promise.allSettled([
      api.profile(signal),
      api.projects(undefined, signal),
    ]);

    if (signal.aborted) return;

    const criticalValue = <T,>(index: number): T | undefined => {
      const result = critical[index];
      return result?.status === "fulfilled" ? (result.value as T) : undefined;
    };

    setProfile(criticalValue<{ profile: Profile }>(0)?.profile ?? null);
    setProjects(criticalValue<{ projects: Project[] }>(1)?.projects ?? []);
    setLoaded(true);
    setError(
      critical.some((r) => r.status === "rejected") ? "Some content is temporarily unavailable." : null,
    );

    const deferred = await Promise.allSettled([
      api.certificates(undefined, signal),
      api.skills(signal),
      api.education(signal),
      api.timeline(signal),
    ]);

    if (signal.aborted) return;

    const deferredValue = <T,>(index: number): T | undefined => {
      const result = deferred[index];
      return result?.status === "fulfilled" ? (result.value as T) : undefined;
    };

    setCertificates(deferredValue<{ certificates: Certificate[] }>(0)?.certificates ?? []);
    setCertTotal(deferredValue<{ total: number }>(0)?.total ?? 0);
    setSkills(deferredValue<{ skills: Skill[] }>(1)?.skills ?? []);
    setEducation(deferredValue<{ items: Education[] }>(2)?.items ?? []);
    setTimeline(deferredValue<{ items: TimelineItem[] }>(3)?.items ?? []);
    setError(
      [...critical, ...deferred].some((r) => r.status === "rejected")
        ? "Some content is temporarily unavailable."
        : null,
    );
  }, []);

  useEffect(() => {
    void load();
    return () => {
      controllerRef.current?.abort();
    };
  }, [load]);

  const value = useMemo<DataState>(
    () => ({
      profile, projects, certificates, certTotal, skills,
      education, timeline, stats, loaded, error, refresh: load,
    }),
    [profile, projects, certificates, certTotal, skills, education, timeline, stats, loaded, error, load],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

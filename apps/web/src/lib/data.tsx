import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PublicHomeData, PublicProject, PublicProjectIndex, TimelineItem, SiteSettings } from "@hp/shared";

import { api } from "./api";

type PublicSettings = Pick<SiteSettings, "chatEnabled" | "contactEnabled" | "maintenanceMode" | "analyticsEnabled">;

interface DataState {
  profile: PublicHomeData["profile"];
  projects: PublicProject[];
  projectIndex: PublicProjectIndex[];
  projectCount: number;
  certificates: PublicHomeData["certificates"];
  certTotal: number;
  skills: PublicHomeData["skills"];
  education: PublicHomeData["education"];
  timeline: TimelineItem[];
  timelineLoaded: boolean;
  timelineError: string | null;
  loadTimeline: () => Promise<void>;
  publicSettings: PublicSettings | null;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataState>({
  profile: null, projects: [], projectIndex: [], projectCount: 0, certificates: [], certTotal: 0,
  skills: [], education: [], timeline: [], timelineLoaded: false, timelineError: null,
  loadTimeline: async () => undefined, publicSettings: null, loaded: false, error: null,
  refresh: async () => undefined,
});

export function useData(): DataState {
  return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [home, setHome] = useState<PublicHomeData | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const homeControllerRef = useRef<AbortController | null>(null);
  const timelineControllerRef = useRef<AbortController | null>(null);
  const timelineRequestRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    homeControllerRef.current?.abort();
    const controller = new AbortController();
    homeControllerRef.current = controller;
    try {
      const next = await api.publicHome(controller.signal);
      if (controller.signal.aborted) return;
      setHome(next);
      setError(null);
    } catch (cause) {
      if (!controller.signal.aborted) setError("Some content is temporarily unavailable.");
    } finally {
      if (!controller.signal.aborted) setLoaded(true);
    }
  }, []);

  const loadTimeline = useCallback((): Promise<void> => {
    if (timelineLoaded) return Promise.resolve();
    if (timelineRequestRef.current) return timelineRequestRef.current;
    const controller = new AbortController();
    timelineControllerRef.current = controller;
    setTimelineError(null);
    const request = api.timeline(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setTimeline(result.items);
        setTimelineLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTimelineError("Experience details couldn't load.");
      })
      .finally(() => {
        if (timelineRequestRef.current === request) timelineRequestRef.current = null;
      });
    timelineRequestRef.current = request;
    return request;
  }, [timelineLoaded]);

  useEffect(() => {
    // React Strict Mode replays effects during development. Defer the initial
    // request one task so its probe mount can clean up before a request starts.
    const startTimer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(startTimer);
      homeControllerRef.current?.abort();
      timelineControllerRef.current?.abort();
    };
  }, [refresh]);

  const value = useMemo<DataState>(() => ({
    profile: home?.profile ?? null,
    projects: home?.projects ?? [],
    projectIndex: home?.projectIndex ?? [],
    projectCount: home?.projectCount ?? 0,
    certificates: home?.certificates ?? [],
    certTotal: home?.certTotal ?? 0,
    skills: home?.skills ?? [],
    education: home?.education ?? [],
    timeline,
    timelineLoaded,
    timelineError,
    loadTimeline,
    publicSettings: home?.publicSettings ?? null,
    loaded,
    error,
    refresh,
  }), [home, timeline, timelineLoaded, timelineError, loadTimeline, loaded, error, refresh]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

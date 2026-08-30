import type { Project } from "@hp/shared";
import { IconArrowRight } from "../../components/ui/icons";

export interface EvolutionPair {
  from: string;
  to: string;
  label: string;
  narrative: string;
}

export const SURVEILLANCE_EVOLUTION: EvolutionPair | null = {
  from: "intelligent-mob-surveillance-system",
  to: "intelligent-surveillance-system",
  label: "One idea, two generations",
  narrative:
    "The Intelligent Mob Surveillance System (2024–25) proved the core idea: detect activity in real time and anchor evidence against tampering. CCTV-X is its production-minded successor — a microservices platform with an evidence chain-of-custody and a court-exportable, Bitcoin-anchored bundle. Same problem, deeper engineering.",
};

interface EvolutionStoryProps {
  evolution: EvolutionPair;
  onOpen: (slug: string) => void;
  onProject: (slug: string) => void;
}

/** Presents two closely-related projects as one evolving line of work, not duplicates. */
export function EvolutionStory({ evolution, onProject }: EvolutionStoryProps) {
  return (
    <aside className="evolution" data-reveal>
      <div className="evolution-badge">{evolution.label}</div>
      <p className="evolution-narrative">{evolution.narrative}</p>
      <div className="evolution-path">
        <button className="evolution-node" onClick={() => onProject(evolution.from)}>
          <span className="evolution-step">v1</span>
          <span className="evolution-name">Intelligent Mob Surveillance System</span>
          <span className="evolution-year">2024–25</span>
        </button>
        <span className="evolution-arrow" aria-hidden="true"><IconArrowRight /></span>
        <button className="evolution-node" onClick={() => onProject(evolution.to)}>
          <span className="evolution-step">v2</span>
          <span className="evolution-name">CCTV-X</span>
          <span className="evolution-year">2025–26</span>
        </button>
      </div>
    </aside>
  );
}
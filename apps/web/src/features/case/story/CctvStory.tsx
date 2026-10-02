import { FLAGSHIP_GALLERY } from "../../projects/flagshipConfig";
import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, EmpathyMap, FlowIcon, HScroll, PipeFlow, Reveal, StatusScale } from "../visuals";

export function CctvStory({ project }: { project: PublicProject }) {
  const [overview, analytics, zones, vault] = FLAGSHIP_GALLERY as [typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number]];
  return (
    <>
      <CaseSection num="01" kick="OPERATING PICTURE" title="The system, on screen" lede="Four real product screens — the operator's working surface, not mockups. Detection, measurement, spatial configuration and sealed evidence.">
        <div className="cs-spread">
          <figure className="cs-spread-hero">
            <img src={overview!.src} alt={overview!.alt} loading="eager" width={overview!.width} height={overview!.height} decoding="async" />
            <figcaption><span className="cap-k">{overview!.role}</span>{overview!.caption} — sources online, active alerts, alert feed, evidence records.</figcaption>
          </figure>
          <div className="cs-spread-pair">
            <figure className="cs-thumb">
              <img src={analytics!.src} alt={analytics!.alt} loading="lazy" width={analytics!.width} height={analytics!.height} decoding="async" />
              <figcaption><span className="cap-k">{analytics!.role}</span>{analytics!.caption} — crowd snapshots, risk index, risk over time.</figcaption>
            </figure>
            <figure className="cs-thumb">
              <img src={zones!.src} alt={zones!.alt} loading="lazy" width={zones!.width} height={zones!.height} decoding="async" />
              <figcaption><span className="cap-k">{zones!.role}</span>{zones!.caption} — occupancy calibration, zone thresholds.</figcaption>
            </figure>
          </div>
          <figure className="cs-spread-hero">
            <img src={vault!.src} alt={vault!.alt} loading="lazy" width={vault!.width} height={vault!.height} decoding="async" />
            <figcaption><span className="cap-k">{vault!.role}</span>{vault!.caption} — hash-ledger commitment, custody trail, attestation status.</figcaption>
          </figure>
        </div>
      </CaseSection>

      <CaseSection num="02" kick="COMPUTER VISION PIPELINE" title="From frames to an investigation event" lede="The detection path that turns a camera stream or uploaded video into a classified event worth reviewing and sealing.">
        <Canvas kicker="CV PIPELINE" right="YOLOV8N · OPENCV · TRACKING" caption={<><b>Read it left to right:</b> each frame is detected, tracked and escalated before anything is allowed to become evidence.</>}>
          <PipeFlow nodes={[
            { label: "Capture", sub: "RTSP · webcam · upload", icon: "camera" },
            { label: "Detect", sub: "YOLOv8n persons", icon: "brain" },
            { label: "Track", sub: "centroid · IoU", icon: "search", hot: true },
            { label: "Escalate", sub: "possible → confirmed", icon: "alert", hot: true, state: true },
            { label: "Investigate", sub: "copilot · evidence", icon: "user" },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Perception</span><span className="lv"><b>YOLOv8n + centroid/IoU tracking</b> — detections become stable tracks before heuristics evaluate crowd, fight and stampede signals.</span></div>
            <div className="cs-lane"><span className="lk">Gate</span><span className="lv">Events move through <b>possible → suspicious → confirmed</b>; the heuristic is labelled as an MVP rather than presented as a trained violence model.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="03" kick="CHAIN OF CUSTODY" title="Evidence you can prove, not promise" lede="Every artifact is encrypted before storage, hashed at creation, and added to an append-only ledger — with external timestamp anchoring for later verification.">
        <Canvas kicker="EVIDENCE LIFECYCLE" right="AES-GCM · SHA-256 · OPENTIMESTAMPS" caption={<><b>The seal happens first:</b> AES-GCM encryption and SHA-256 hashing are applied before storage, then the digest enters the append-only ledger.</>}>
          <PipeFlow nodes={[
            { label: "Camera", sub: "raw frames", icon: "camera" },
            { label: "Detection", sub: "event signal", icon: "brain" },
            { label: "Event", sub: "clip extracted", icon: "alert", hot: true },
            { label: "Evidence", sub: "clip artifact", icon: "evidence" },
            { label: "Seal", sub: "AES-GCM · SHA-256", icon: "shield", hot: true, state: true },
            { label: "Ledger", sub: "append-only hash chain", icon: "ledger" },
            { label: "Timestamp", sub: "OpenTimestamps · Bitcoin", icon: "attest" },
            { label: "Verify", sub: "hash re-check", icon: "search" },
            { label: "Operator", sub: "dashboard", icon: "user" },
          ]} />
        </Canvas>
      </CaseSection>

      <CaseSection num="04" kick="OPERATOR WORKFLOW" title="What the human does" lede="The dashboard is the operational surface: monitor, triage, verify, export.">
        <Split
          left={<><h3>Designed for the night shift</h3><p>{project.problem}</p><p>{project.solution}</p></>}
          right={(
            <div className="cs-journey">
              {[
                ["Monitor", "Sources-online board with live alert feed — fight, crowd and mob signals surface with context."],
                ["Triage", "Open the event: detection snapshot, zone, confidence and linked evidence record."],
                ["Verify", "Re-check the sealed clip against its SHA-256 digest and append-only ledger record."],
                ["Export", "Hand over an encrypted, hashed, timestamp-anchored bundle a third party can verify."],
              ].map(([t, d], i) => (
                <div key={t} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></div>
              ))}
            </div>
          )}
        />
      </CaseSection>

      <CaseSection num="05" kick="INCIDENT LIFECYCLE" title="One alert, end to end" lede="A single timeline follows an incident from first frame to a verifiable evidence bundle.">
        <div className="cs-timeline">
          {[
            ["T+0s — Capture", "Frame ingestion", "A stream, webcam or uploaded video enters the detection service for processing."],
            ["T+1s — Detect", "YOLOv8 + OpenCV", "Person detections tracked across frames; crowd density accumulates per zone."],
            ["T+2s — Event", "Escalation ladder", "A heuristic crosses a threshold and extracts an evidence clip for investigation."],
            ["T+3s — Seal", "AES-GCM · SHA-256", "Clip encrypted and hashed before storage; the digest is committed to the ledger."],
            ["T+later — Anchor", "OpenTimestamps → Bitcoin", "The ledger digest is submitted for external timestamp attestation; confirmation can take about 24 hours."],
            ["T+later — Prove", "Dashboard + export", "Operator reviews the record and exports a bundle with an offline verification path."],
          ].map(([t, s, d]) => (
            <div key={t} className="cs-tl"><span className="tk">{t}</span><div className="tt">{s}</div><p>{d}</p></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="06" kick="ARCHITECTURE MAP" title="How it runs" lede={project.architecture ?? undefined}>
        <Canvas kicker="DEPLOYED TOPOLOGY" right="DOCKER COMPOSE · CADDY" caption={<>A separate AI service behind <b>FastAPI</b>, metadata in <b>MongoDB</b>, and a JWT-protected <b>React</b> investigation UI — composed behind Caddy HTTPS.</>}>
          <HScroll label="Deployment: AI service, FastAPI, MongoDB, investigation UI, Docker Compose, Caddy">
            <div className="cs-flow" aria-hidden="true">
              {[
                ["Detect", "AI service"], ["Serve", "FastAPI"], ["Store", "MongoDB"], ["Ledger", "append-only hash chain"], ["Attest", "OpenTimestamps · Bitcoin"], ["View", "React investigation UI"], ["Serve", "Caddy HTTPS"],
              ].map(([b, s], i, a) => (
                <div key={`${b}-${i}`} style={{ display: "contents" }}>
                  <div className="cs-node"><span className="ic"><FlowIcon kind={["brain", "api", "ledger", "attest", "attest", "web", "shield"][i]} /></span><b>{b}</b><span>{s}</span></div>
                  {i < a.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
        </Canvas>
      </CaseSection>

      <CaseSection num="07" kick="TECHNICAL DECISIONS" title="Why it was built this way" lede="Each decision pairs the choice with the reason — no plain numbered list.">
        <DecisionCards items={(project.decisions ?? []).map((d, i) => ({
          title: d,
          why: [
            "Separate the AI service from the API so GPU-bound inference cannot starve request handling.",
            "An append-only hash ledger makes mutations detectable instead of relying on a database-only audit trail.",
            "OpenTimestamps provides externally verifiable timestamps without running a blockchain node.",
            "Heuristic fight detection is labelled as an MVP with documented limitations.",
          ][i] ?? "Grounded in the repository implementation.",
          tag: ["Integrity", "Self-verifying", "Async API", "CI/CD"][i] ?? "Architecture",
        }))} />
      </CaseSection>

      <CaseSection num="08" kick="SECURITY · CHALLENGE · OUTCOME" title="Hard parts, honestly" lede="Synchronizing on-chain writes with offline storage while keeping detection latency acceptable on consumer hardware.">
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "Keeping detection latency acceptable on consumer hardware." },
          { k: "Constraint", v: "Live streams, evidence consistency and third-party verification must coexist across services." },
          { k: "Decision", v: "Seal first (AES-GCM + SHA-256), then commit the digest to an append-only ledger." },
          { k: "Trade-off", v: "External timestamp confirmation is asynchronous; the bundle remains locally verifiable while it is pending." },
          { k: "Outcome", v: project.results ?? "Actively developed flagship with documented limitations and an offline verifier." },
        ]} />
        <StatusScale
          items={[
            { k: "Built", v: "Detection + evidence pipeline" },
            { k: "Working", v: "Investigation UI + ledger flow" },
            { k: "Documented", v: "Offline bundle verifier" },
            { k: "Limited", v: "Heuristic detection is not a trained violence model" },
            { k: "Future", v: "Broader production validation and monitoring" },
          ]}
          active={[0, 1, 2, 3]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

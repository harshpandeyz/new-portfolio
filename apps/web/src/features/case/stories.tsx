import type { Project } from "@hp/shared";
import { FLAGSHIP_GALLERY } from "../projects/flagshipConfig";
import { TechGlyph } from "../tech/TechIcons";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, EmpathyMap, FlowIcon, HScroll, PipeFlow, Reveal, SecurityStrip, StatusScale } from "./visuals";

/* Shared bits */

function TechStrip({ stack }: { stack: string[] }) {
  return (
    <div className="cs-secgrid" aria-label="Technology">
      {stack.map((t) => (
        <span key={t} className="cs-secbadge"><TechGlyph name={t} />{t}</span>
      ))}
    </div>
  );
}

function Split({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div className="cs-split"><Reveal className="cs-prose">{left}</Reveal><Reveal delay={0.08}>{right}</Reveal></div>;
}

/* ════════════════ MOB SURVEILLANCE ════════════════ */

export function MobStory({ project }: { project: Project }) {
  const [overview, analytics, zones, vault] = FLAGSHIP_GALLERY as [typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number], typeof FLAGSHIP_GALLERY[number]];
  return (
    <>
      <CaseSection num="01" kick="OPERATING PICTURE" title="The system, on screen" lede="Four real product screens — the operator's working surface, not mockups. Detection, measurement, spatial configuration and sealed evidence.">
        <div className="cs-spread">
          <figure className="cs-spread-hero">
            <img src={overview!.src} alt={overview!.alt} loading="eager" width={1470} height={803} decoding="async" fetchPriority="high" />
            <figcaption><span className="cap-k">{overview!.role}</span>{overview!.caption} — sources online, active alerts, alert feed, evidence records.</figcaption>
          </figure>
          <div className="cs-spread-pair">
            <figure className="cs-thumb">
              <img src={analytics!.src} alt={analytics!.alt} loading="lazy" decoding="async" />
              <figcaption><span className="cap-k">{analytics!.role}</span>{analytics!.caption} — crowd snapshots, risk index, risk over time.</figcaption>
            </figure>
            <figure className="cs-thumb">
              <img src={zones!.src} alt={zones!.alt} loading="lazy" decoding="async" />
              <figcaption><span className="cap-k">{zones!.role}</span>{zones!.caption} — occupancy calibration, zone thresholds.</figcaption>
            </figure>
          </div>
          <figure className="cs-spread-hero">
            <img src={vault!.src} alt={vault!.alt} loading="lazy" width={1470} height={803} decoding="async" />
            <figcaption><span className="cap-k">{vault!.role}</span>{vault!.caption} — hash-ledger commitment, custody trail, attestation status.</figcaption>
          </figure>
        </div>
      </CaseSection>

      <CaseSection num="02" kick="COMPUTER VISION PIPELINE" title="From photons to mob event" lede="The detection path that turns a raw CCTV feed into a classified event worth sealing.">
        <Canvas kicker="CV PIPELINE" right="YOLOV8 · OPENCV · MEDIAPIPE" caption={<><b>Read it left to right:</b> each frame is detected, tracked and classified before anything is allowed to become evidence.</>}>
          <PipeFlow nodes={[
            { label: "Capture", sub: "CCTV feed in", icon: "camera" },
            { label: "Detect", sub: "YOLOv8 persons", icon: "brain" },
            { label: "Track", sub: "OpenCV motion", icon: "search", hot: true },
            { label: "Pose", sub: "MediaPipe cues", icon: "user" },
            { label: "Classify", sub: "mob event?", icon: "alert", hot: true, state: true },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Perception</span><span className="lv"><b>YOLOv8 + OpenCV + MediaPipe</b> — person detection, motion tracking and pose cues fused into one event signal.</span></div>
            <div className="cs-lane"><span className="lk">Gate</span><span className="lv">Only a <b>classified mob event</b> triggers clip extraction — the pipeline refuses to seal noise.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="03" kick="CHAIN OF CUSTODY" title="Evidence you can prove, not promise" lede="Every artifact is encrypted before storage, hashed at creation, and anchored on-chain — tampering becomes mathematically detectable.">
        <Canvas kicker="EVIDENCE LIFECYCLE" right="AES-256 · SHA-256 · ETHEREUM" caption={<><b>The seal happens first:</b> AES-256 encryption and SHA-256 hashing are applied before any storage, so at-rest artifacts are self-verifying.</>}>
          <PipeFlow nodes={[
            { label: "Camera", sub: "raw frames", icon: "camera" },
            { label: "Detection", sub: "mob signal", icon: "brain" },
            { label: "Event", sub: "clip extracted", icon: "alert", hot: true },
            { label: "Evidence", sub: "clip artifact", icon: "evidence" },
            { label: "Seal", sub: "AES-256 · SHA-256", icon: "shield", hot: true, state: true },
            { label: "Blockchain", sub: "Solidity · Web3.py", icon: "ledger" },
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
                ["Monitor", "Sources-online board with live alert feed — fight and mob detections surface with context."],
                ["Triage", "Open the event: detection snapshot, zone, confidence and linked evidence record."],
                ["Verify", "Re-check the sealed clip against its SHA-256 digest and on-chain record."],
                ["Export", "Hand over an encrypted, hashed, chain-anchored bundle a third party can verify."],
              ].map(([t, d], i) => (
                <div key={t} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></div>
              ))}
            </div>
          )}
        />
      </CaseSection>

      <CaseSection num="05" kick="INCIDENT LIFECYCLE" title="One alert, end to end" lede="A single timeline follows an incident from first frame to court-ready bundle.">
        <div className="cs-timeline">
          {[
            ["T+0s — Capture", "Frame ingestion", "CCTV feed enters the detection service; every frame is timestamped at the door."],
            ["T+1s — Detect", "YOLOv8 + OpenCV", "Person detections tracked across frames; crowd density accumulates per zone."],
            ["T+2s — Event", "Mob classified", "Threshold crossed — the system declares a mob event and extracts the evidence clip."],
            ["T+3s — Seal", "AES-256 · SHA-256", "Clip encrypted and hashed before storage; nothing unverifiable touches disk."],
            ["T+min — Anchor", "Web3.py → Solidity", "Hash logged on Ethereum via smart contract against a local node in development."],
            ["T+later — Prove", "Dashboard + export", "Operator reviews in the JWT-protected React dashboard and exports the verifiable bundle."],
          ].map(([t, s, d]) => (
            <div key={t} className="cs-tl"><span className="tk">{t}</span><div className="tt">{s}</div><p>{d}</p></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="06" kick="ARCHITECTURE MAP" title="How it runs" lede={project.architecture ?? undefined}>
        <Canvas kicker="DEPLOYED TOPOLOGY" right="DOCKER · JENKINS · CADDY" caption={<>Python detection behind <b>FastAPI</b>, metadata in <b>MongoDB</b>, JWT-protected <b>React + Vite</b> dashboard — shipped as Docker microservices through Jenkins, served over Caddy HTTPS.</>}>
          <HScroll label="Deployment: detection service, FastAPI, MongoDB, dashboard, Docker, Jenkins, Caddy">
            <div className="cs-flow" aria-hidden="true">
              {[
                ["Detect", "Python service"], ["Serve", "FastAPI"], ["Store", "MongoDB"], ["Anchor", "Web3.py → ETH"], ["View", "React + Vite"], ["Ship", "Docker · Jenkins"], ["Serve", "Caddy HTTPS"],
              ].map(([b, s], i, a) => (
                <div key={`${b}-${i}`} style={{ display: "contents" }}>
                  <div className="cs-node"><span className="ic"><FlowIcon kind={["brain", "api", "ledger", "attest", "web", "documents", "shield"][i]} /></span><b>{b}</b><span>{s}</span></div>
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
            "Evidence integrity must not depend on trusting the operator — anchoring beats a third party.",
            "Self-verifying artifacts: if ciphertext or hash drifts, verification fails loudly.",
            "Async inference endpoints plus automatic OpenAPI docs fit a detection service.",
            "Microservice images need automated build, test and deploy — no manual shipping.",
          ][i] ?? "Grounded in the repository implementation.",
          tag: ["Integrity", "Self-verifying", "Async API", "CI/CD"][i] ?? "Architecture",
        }))} />
      </CaseSection>

      <CaseSection num="08" kick="SECURITY · CHALLENGE · OUTCOME" title="Hard parts, honestly" lede="Synchronizing on-chain writes with offline storage while keeping detection latency acceptable on consumer hardware.">
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "Keeping detection latency acceptable on consumer hardware." },
          { k: "Constraint", v: "On-chain writes are slow and offline clips must stay consistent with them." },
          { k: "Decision", v: "Seal first (AES-256 + SHA-256), anchor the hash via Web3.py + Solidity." },
          { k: "Trade-off", v: "Local Ethereum node in development; anchoring latency accepted for verifiability." },
          { k: "Outcome", v: project.results ?? "Presented inter-collegiate; foundation for the CCTV-X successor." },
        ]} />
        {project.securityNotes && <SecurityStrip items={project.securityNotes.split(" · ")} />}
        <StatusScale
          items={[
            { k: "Built", v: "Detection + evidence pipeline" },
            { k: "Working", v: "Dashboard + anchoring flow" },
            { k: "Verified", v: "Presented, certificate on record" },
            { k: "Limited", v: "Consumer-hardware latency" },
            { k: "Future", v: "CCTV-X successor system" },
          ]}
          active={[0, 1, 2, 3]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

/* ════════════════ ORCHESTRAAI ════════════════ */

const ORCH_FLOW = [
  { label: "Task", sub: "user intent", icon: "user" },
  { label: "Context", sub: "build + compress", icon: "brain" },
  { label: "Routing", sub: "model router", icon: "api", hot: true },
  { label: "Provider", sub: "OpenRouter · OpenAI", icon: "api", hot: true, state: true },
  { label: "Tools", sub: "sandbox exec", icon: "evidence" },
  { label: "Memory", sub: "cache · telemetry", icon: "ledger" },
  { label: "SSE", sub: "stream output", icon: "chat" },
  { label: "Re-eval", sub: "→ complete", icon: "attest" },
];

export function OrchestraStory({ project }: { project: Project }) {
  return (
    <>
      <CaseSection num="01" kick="RUNTIME ARCHITECTURE" title="A control plane, not a chatbot" lede="OrchestraAI continuously evaluates model health, context limits, budget and latency — then routes, compresses, caches and recovers. One verified loop:">
        <Canvas dark kicker="ADAPTIVE AGENT RUNTIME · LIVE LOOP" right="TASK → COMPLETE" caption={<><b>The verified runtime:</b> Task → Context → Routing → Provider → Tools → Memory / Cache / Telemetry → SSE → Re-evaluate → Complete.</>}>
          <PipeFlow dark nodes={ORCH_FLOW} />
          <div className="cs-lanes">
            <div className="cs-lane cs-lane--dark"><span className="lk">Intake plane</span><span className="lv"><b>Task + Context</b> — user intent assembled with compressed history before any model is chosen.</span></div>
            <div className="cs-lane cs-lane--dark"><span className="lk">Decision plane</span><span className="lv"><b>Routing + Provider</b> — model registry and router pick the execution target per task.</span></div>
            <div className="cs-lane cs-lane--dark"><span className="lk">Execution plane</span><span className="lv"><b>Tools + Memory + SSE</b> — sandboxed tools run, state persists, output streams; then re-evaluate.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="02" kick="AGENT EXECUTION LIFECYCLE" title="Every task walks the same loop" lede="Nine stages, one direction — with a deliberate loop back for re-evaluation instead of blind completion.">
        <div className="cs-timeline">
          {[
            ["Stage 01 — Task", "User intent arrives", "A task enters the runtime with tenant context and budget attached."],
            ["Stage 02 — Context", "Build + compress", "Context manager assembles history and compresses past limits before spending tokens."],
            ["Stage 03 — Routing", "Model router decides", "Decision engine weighs health, context window, budget and latency — with hysteresis against oscillation."],
            ["Stage 04 — Provider", "Call executed", "Provider call goes out through the registry — OpenRouter, OpenAI or Anthropic behind one interface."],
            ["Stage 05 — Tools", "Sandboxed execution", "Tool registry executes in an isolated worker; idempotent so retries are safe."],
            ["Stage 06 — Memory", "Cache + telemetry", "Responses cached, memory updated, telemetry recorded for the next routing decision."],
            ["Stage 07 — SSE", "Stream to console", "Output streams token-by-token to the React console over Server-Sent Events."],
            ["Stage 08 — Re-evaluate", "Complete or optimize?", "State machine asks: done, or route again with fresh context? Checkpoints make resume safe."],
            ["Stage 09 — Complete", "Sealed result", "Checkpoint integrity sealed; decision log kept structured — never free-text chain-of-thought."],
          ].map(([t, s, d]) => (
            <div key={t} className="cs-tl"><span className="tk">{t}</span><div className="tt">{s}</div><p>{d}</p></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="03" kick="MODEL ROUTING" title="Switching models without thrashing" lede="Routing is cost-aware with hysteresis: the runtime pays a switching cost only when quality gains justify it.">
        <Canvas kicker="ROUTING DECISION" right="HYSTERESIS · NO OSCILLATION" caption={<>Health, context limits, budget and latency feed one decision engine. <b>Switching-cost awareness</b> keeps the router from flip-flopping between providers.</>}>
          <HScroll label="Routing: signals converge on decision engine, then route to a provider">
            <div className="cs-flow" aria-hidden="true">
              {[["Health", "model status"], ["Context", "window limits"], ["Budget", "tenant cost"], ["Latency", "p95 pressure"]].map(([b, s]) => (
                <div key={b} className="cs-node"><span className="ic"><FlowIcon kind="brain" /></span><b>{b}</b><span>{s}</span></div>
              ))}
              <span className="cs-link flowline" />
              <div className="cs-node is-hot"><span className="ic"><FlowIcon kind="api" /></span><b>Decision engine</b><span>structured, no CoT</span><span className="st" /></div>
              <span className="cs-link flowline" />
              <div className="cs-node"><span className="ic"><FlowIcon kind="chat" /></span><b>Provider</b><span>routed call</span></div>
            </div>
          </HScroll>
        </Canvas>
      </CaseSection>

      <CaseSection num="04" kick="EXECUTION BOUNDARY" title="Tools run behind glass" lede="Customer code executes in an isolated sandbox worker — the control plane never trusts tool output with its own privileges.">
        <Split
          left={<><h3>Idempotent by design</h3><p>Checkpointed recovery means a restart resumes without re-running destructive tools: each tool execution is idempotent and each checkpoint is integrity-sealed.</p><p>Network egress for custom tools is SSRF-protected, and authentication fails closed in production.</p></>}
          right={(
            <Canvas kicker="TOOL BOUNDARY" right="SANDBOX · SSRF-SAFE">
              <PipeFlow nodes={[
                { label: "Registry", sub: "tool catalogue", icon: "documents" },
                { label: "Sandbox", sub: "isolated worker", icon: "shield", hot: true, state: true },
                { label: "Execute", sub: "idempotent run", icon: "evidence" },
                { label: "Checkpoint", sub: "sealed state", icon: "ledger", hot: true },
              ]} />
            </Canvas>
          )}
        />
      </CaseSection>

      <CaseSection num="05" kick="STATE · STREAM · RECOVERY" title="Memory, events and failure" lede="Three subsystems keep the runtime honest: what it remembers, what it streams, and how it survives a crash.">
        <div className="cs-factgrid">
          <div className="cs-fact"><span className="k">Memory / Cache / Telemetry</span><div className="t">State with a purpose</div><p className="d">Memory manager, cache manager and telemetry feed the next routing decision — context improves instead of just accumulating.</p></div>
          <div className="cs-fact"><span className="k">SSE event bus</span><div className="t">Streams that survive gaps</div><p className="d">Replay, gap detection and canonical event naming enforced by tests — the console never silently misses a beat.</p></div>
          <div className="cs-fact"><span className="k">Failure / recovery</span><div className="t">Resume, don't redo</div><p className="d">Versioned checkpoints plus idempotent tools: safe retries, safe restarts, no double-execution of destructive steps.</p></div>
        </div>
        <Canvas kicker="RE-EVALUATION STATE MACHINE" right="LOOP UNTIL COMPLETE">
          <PipeFlow nodes={[
            { label: "Streamed", sub: "SSE output done", icon: "chat" },
            { label: "Evaluate", sub: "done or optimize?", icon: "brain", hot: true, state: true },
            { label: "Optimize", sub: "re-route w/ context", icon: "api" },
            { label: "Complete", sub: "sealed result", icon: "attest", hot: true },
          ]} />
        </Canvas>
      </CaseSection>

      <CaseSection num="06" kick="PERSISTENCE · DEPLOYMENT" title="Where state lives, how it ships" lede={project.architecture ?? undefined}>
        <div className="cs-compare">
          <div className="cs-cmp cs-cmp--hi"><span className="k">Real — verified in repo</span><h4>What actually runs</h4><ul><li><b>Real provider integration</b> with streaming SSE to a React console</li><li><b>Durable persistence:</b> Postgres authoritative, Redis locks and queues</li><li><b>BYOK auth</b> — tenant keys encrypted at rest, never casual</li><li><b>Test suite</b> covering recovery, economics and failover</li></ul></div>
          <div className="cs-cmp"><span className="k">Bounded — stated honestly</span><h4>What varies by tenant</h4><ul><li><b>Model behavior</b> follows whichever provider key is supplied</li><li><b>Cost / latency</b> depend on tenant budget and provider health</li><li><b>Tool risk</b> bounded by sandbox isolation and SSRF guards</li><li><b>No invented benchmarks</b> — economics enforced, not advertised</li></ul></div>
        </div>
        <Canvas kicker="DEPLOYMENT TOPOLOGY" right="DOCKER · NODE · PG · REDIS">
          <HScroll label="Deployment: React console streams from Node API with sandbox worker, Postgres and Redis">
            <div className="cs-flow" aria-hidden="true">
              {[["Console", "React · SSE"], ["API", "Node · TypeScript"], ["Worker", "sandboxed tools"], ["Store", "PostgreSQL"], ["Fast", "Redis queues"]].map(([b, s], i, a) => (
                <div key={b} style={{ display: "contents" }}>
                  <div className={`cs-node${i === 1 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={["web", "api", "shield", "ledger", "brain"][i]} /></span><b>{b}</b><span>{s}</span></div>
                  {i < a.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
        </Canvas>
      </CaseSection>

      <CaseSection num="07" kick="TECHNICAL DECISIONS" title="Five load-bearing choices" lede="The decisions that make this a runtime rather than a demo.">
        <DecisionCards items={[
          { title: "BYOK model — tenants supply provider keys, never stored long-term without encryption.", why: "Cost and liability stay with the tenant; the runtime never becomes a key custodian.", tag: "Trust" },
          { title: "Structured decisions, no free-text chain-of-thought.", why: "Decision logs stay auditable and machine-checkable instead of plausible prose.", tag: "Auditability" },
          { title: "Switching-cost-aware routing with hysteresis.", why: "Prevents oscillation: the router only pays to switch when gains justify it.", tag: "Economics" },
          { title: "Checkpointed recovery with idempotency for safe retries.", why: "Restarts resume without re-running destructive tools — recovery is a first-class path.", tag: "Reliability" },
          { title: "Event bus with replay, gap detection and canonical naming enforced by tests.", why: "Streams that can prove they didn't drop anything the console needed.", tag: "Streaming" },
        ]} />
      </CaseSection>

      <CaseSection num="08" kick="CHALLENGE · SECURITY · OUTCOME" title="Hard parts, honestly" lede="Balancing switching cost against quality, resuming safely after restarts, and keeping custom-tool egress SSRF-safe.">
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "" },
          { k: "Constraint", v: "Retries must never double-execute destructive tools; streams must not silently gap." },
          { k: "Decision", v: "Sealed checkpoints + idempotent tools + replay-capable event bus." },
          { k: "Trade-off", v: "Hysteresis delays some beneficial switches to buy stability." },
          { k: "Outcome", v: project.results ?? "" },
        ]} />
        {project.securityNotes && <SecurityStrip items={project.securityNotes.split(" · ")} />}
        <StatusScale
          items={[
            { k: "Built", v: "Router + tools + memory" },
            { k: "Working", v: "SSE streaming live" },
            { k: "Verified", v: "Recovery + failover tests" },
            { k: "Limited", v: "Tenant-key dependent" },
            { k: "Future", v: "Policy tuning" },
          ]}
          active={[0, 1, 2]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

/* ════════════════ QUANTUMMIND ════════════════ */

export function QuantumStory({ project }: { project: Project }) {
  return (
    <>
      <CaseSection num="01" kick="RAG ARCHITECTURE" title="Answers grounded in your documents" lede="The model elaborates; the vector store cites. Upload research PDFs, ask questions, get source-linked answers streamed token by token.">
        <Canvas kicker="RETRIEVAL-AUGMENTED LOOP" right="FAISS · SSE · GROUNDED" caption={<><b>The contract:</b> no chunk retrieved, no grounded answer. Generation always follows retrieval.</>}>
          <PipeFlow nodes={[
            { label: "Documents", sub: "research PDFs", icon: "documents" },
            { label: "Ingest", sub: "chunk + clean", icon: "ingest" },
            { label: "Embed", sub: "sentence-transformers", icon: "brain", hot: true },
            { label: "Retrieve", sub: "FAISS top-k", icon: "search", hot: true, state: true },
            { label: "Generate", sub: "Groq · OpenAI", icon: "chat" },
            { label: "Answer", sub: "SSE stream", icon: "web" },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Write path</span><span className="lv"><b>PDF → chunks → embeddings → FAISS index.</b> Ingestion happens once; every question reuses it.</span></div>
            <div className="cs-lane"><span className="lk">Read path</span><span className="lv"><b>Question → embed → similarity search → top-k chunks → LLM → streamed answer.</b> Retrieval context travels with the prompt.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="02" kick="DOCUMENT LIFECYCLE" title="One PDF's journey" lede="From upload to cited answer — every stage the document passes through.">
        <div className="cs-timeline">
          {[
            ["Step 01 — Upload", "Corpus grows", "Research PDF lands in the platform; metadata persisted in PostgreSQL."],
            ["Step 02 — Chunk", "Coherence preserved", "Document split into retrievable chunks sized to keep context coherent."],
            ["Step 03 — Embed", "Meaning vectorized", "sentence-transformers turns each chunk into a searchable embedding."],
            ["Step 04 — Index", "FAISS ready", "Vectors indexed locally — dependency-light, no external vector service required."],
            ["Step 05 — Ask", "Question embedded", "User query embedded the same way; FAISS returns the most similar chunks."],
            ["Step 06 — Answer", "Grounded + streamed", "LLM answers from retrieved context; tokens stream over SSE through both backends."],
          ].map(([t, s, d]) => (
            <div key={t} className="cs-tl"><span className="tk">{t}</span><div className="tt">{s}</div><p>{d}</p></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="03" kick="SYSTEM MAP" title="Four containers, one question" lede={project.architecture ?? undefined}>
        <Canvas kicker="DEPLOYED SERVICES" right="SPRING · FASTAPI · REACT · PG">
          <HScroll label="Services: Spring Boot API, FastAPI AI service, React frontend, PostgreSQL">
            <div className="cs-flow" aria-hidden="true">
              {[["UI", "React 18 · Vite · nginx :80"], ["API", "Spring Boot :8080"], ["AI", "FastAPI :8000"], ["Vectors", "FAISS · local"], ["Store", "PostgreSQL 16"]].map(([b, s], i, a) => (
                <div key={b} style={{ display: "contents" }}>
                  <div className={`cs-node${i === 2 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={["web", "api", "brain", "search", "ledger"][i]} /></span><b>{b}</b><span>{s}</span></div>
                  {i < a.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
        </Canvas>
        <Split
          left={<><h3>Researcher workflow</h3><p>A researcher uploads a corpus once, then lives in the ask-and-verify loop: question, grounded answer, check the sources, refine the question. Vision analysis extends the same loop to quantum-circuit images.</p><p>An analytics dashboard tracks usage across the loop.</p></>}
          right={(
            <div className="cs-journey">
              {[["Upload corpus", "Drop research PDFs; chunking and indexing happen behind one action."], ["Ask grounded questions", "Multi-turn chat answers from retrieved chunks — not from parametric memory."], ["Verify against sources", "Answers trace back to stored documents; hallucination surface shrinks."], ["Analyze circuits visually", "Submit quantum-circuit images for vision-model analysis."], ["Track usage", "Analytics dashboard shows what the corpus is actually used for."]].map(([t, d], i) => (
                <div key={t} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></div>
              ))}
            </div>
          )}
        />
      </CaseSection>

      <CaseSection num="04" kick="TRADE-OFFS, NO FAKE NUMBERS" title="Why this shape" lede="Qualitative where it matters — relative posture, not invented benchmarks.">
        <div className="cs-qual">
          {[
            ["Local vector search", 88, "FAISS — dependency-light"],
            ["Provider flexibility", 76, "Groq · OpenAI · Sarvam"],
            ["Stream responsiveness", 70, "SSE, proxy-friendly"],
            ["Polyglot complexity", 45, "Two backends to operate"],
          ].map(([k, w, v]) => (
            <div key={k as string} className="cs-qrow"><span className="qk">{k}</span><span className="cs-qbar"><i style={{ width: `${w}%` }} /></span><span className="qv">{v}</span></div>
          ))}
        </div>
        <p className="cs-note">Bars show relative design emphasis, not measured metrics. No benchmarks are claimed.</p>
        <DecisionCards items={[
          { title: "Polyglot split — Spring Boot for transactional API, FastAPI for the AI path.", why: "Each runtime does what it is best at; the REST boundary between them is explicit and documented.", tag: "Architecture" },
          { title: "FAISS + sentence-transformers for local vector search.", why: "No external vector service to operate or pay for; the index ships with the deployment.", tag: "Retrieval" },
          { title: "SSE over WebSockets for streamed answers.", why: "Simpler, HTTP-native and proxy-friendly for token-by-token delivery.", tag: "Streaming" },
          { title: "Pluggable LLM providers behind one interface.", why: "Groq default, OpenAI for vision, Sarvam available — swap without rewiring the pipeline.", tag: "Flexibility" },
        ]} />
      </CaseSection>

      <CaseSection num="05" kick="LIMITS · SECURITY · OUTCOME" title="What it doesn't pretend" lede="Chunk coherence across the Spring Boot ↔ FastAPI boundary and unbuffered streaming through two backends were the real fights.">
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "" },
          { k: "Constraint", v: "Two backends must stream as one; chunks must stay coherent across the boundary." },
          { k: "Decision", v: "Explicit REST contract between services; SSE piped end to end without buffering." },
          { k: "Trade-off", v: "Polyglot ops burden accepted for AI-path ergonomics." },
          { k: "Outcome", v: project.results ?? "" },
        ]} />
        {project.securityNotes && <SecurityStrip items={project.securityNotes.split(" · ")} />}
        <StatusScale
          items={[
            { k: "Built", v: "4-service RAG platform" },
            { k: "Working", v: "Streamed grounded chat" },
            { k: "Verified", v: "Maven + pytest suites" },
            { k: "Limited", v: "Corpus-bound answers" },
            { k: "Future", v: "Citation surfacing" },
          ]}
          active={[0, 1, 2]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

/* ════════════════ SKILLMATCH ════════════════ */

export function SkillStory({ project }: { project: Project }) {
  return (
    <>
      <CaseSection num="01" kick="USER JOURNEY" title="From 'what next?' to a path" lede="Learners drown in unordered catalogues. SkillMatch computes what to learn next from what they already know.">
        <div className="cs-journey">
          {[
            ["Register", "Create an account; sessions persist in MySQL-backed storage with bcrypt-hashed passwords."],
            ["Declare skills", "Tell the system what you already know — the profile everything is computed from."],
            ["Target a role", "Pick the role you're aiming at; it becomes the relevance anchor."],
            ["Get a ranked path", "Scoring engine ranks candidates by category match, role relevance and difficulty progression."],
            ["Learn in order", "Follow a progressive path instead of a flat list — each step builds on the last."],
            ["Grow the profile", "New skills feed back into the profile; the next recommendation gets smarter."],
          ].map(([t, d], i) => (
            <div key={t} className="cs-jstep"><span className="jn">{String(i + 1).padStart(2, "0")}</span><div><b>{t}</b><p>{d}</p></div></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="02" kick="EMPATHY MAP" title="Who this is for" lede="The learner's world, in their terms — the pains that make a computed path worth building.">
        <EmpathyMap cells={[
          { k: "Thinks", v: "“There are too many courses — I don't know which one is actually next for me.”" },
          { k: "Feels", v: "Overwhelmed by flat catalogues; anxious about wasting months on the wrong skill." },
          { k: "Says", v: "“Just tell me what to learn after what I already know.”" },
          { k: "Does", v: "Registers, lists known skills, names a target role — then follows the ranked path." },
          { k: "Pains", v: "Unordered course lists; tutorials that assume the wrong starting level.", tone: "pain" },
          { k: "Needs", v: "A progressive, explainable next step computed from their real profile.", tone: "need" },
        ]} />
      </CaseSection>

      <CaseSection num="03" kick="RECOMMENDATION PIPELINE" title="Transparent scoring, not a black box" lede="Candidate skills are ranked by three explainable signals — every recommendation can be audited.">
        <Canvas kicker="SCORING ENGINE" right="EXPLAINABLE · AUDITABLE" caption={<><b>Three signals, one ranking:</b> category match with the learner's profile, keyword relevance to the target role, difficulty progression.</>}>
          <PipeFlow nodes={[
            { label: "User", sub: "known skills", icon: "user" },
            { label: "Skills", sub: "candidate pool", icon: "documents" },
            { label: "Role", sub: "target anchor", icon: "auth" },
            { label: "Score", sub: "3-signal rank", icon: "brain", hot: true, state: true },
            { label: "Path", sub: "ordered steps", icon: "api" },
          ]} />
        </Canvas>
        <table className="cs-matrix" aria-label="Scoring decision matrix">
          <thead><tr><th>Signal</th><th>What it measures</th><th>Why it matters</th></tr></thead>
          <tbody>
            <tr><td>Category match</td><td>Overlap between candidate skill category and the learner's declared profile.</td><td>Keeps recommendations adjacent to real knowledge. <span className="cs-pick">core</span></td></tr>
            <tr><td>Role relevance</td><td>Keyword alignment between the skill and the target role.</td><td>Aims every step at the stated destination. <span className="cs-pick">core</span></td></tr>
            <tr><td>Difficulty progression</td><td>Whether the step is the right next rung — neither trivial nor a leap.</td><td>Helpful, never patronizing. <span className="cs-pick">core</span></td></tr>
          </tbody>
        </table>
      </CaseSection>

      <CaseSection num="04" kick="SKILL → ROLE MAP" title="How skills connect to roles" lede="The relationship map behind the ranking — skills cluster by category, roles pull the clusters that matter.">
        <Canvas kicker="RELATIONSHIP MAP" right="CATEGORY · ROLE · LEVEL">
          <HScroll label="Relationship: skill categories connect through learner profile to target role and ranked path">
            <div className="cs-flow" aria-hidden="true">
              {[["Catalogue", "skills · categories"], ["Profile", "user_skills"], ["Role", "target role"], ["Engine", "score + rank"], ["Path", "learn next"]].map(([b, s], i, a) => (
                <div key={b} style={{ display: "contents" }}>
                  <div className={`cs-node${i === 3 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={["documents", "user", "auth", "brain", "api"][i]} /></span><b>{b}</b><span>{s}</span></div>
                  {i < a.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
        </Canvas>
        <Split
          left={<><h3>System architecture</h3><p>{project.architecture}</p><p>Admins manage the catalogue through protected CRUD endpoints; learners and admins are separated by role-based access.</p></>}
          right={(
            <div className="cs-compare">
              <div className="cs-cmp"><span className="k">Learner</span><h4>Discover + follow</h4><ul><li><b>Register</b> and declare skills</li><li><b>Select</b> a target role</li><li><b>Receive</b> a ranked learning path</li></ul></div>
              <div className="cs-cmp cs-cmp--hi"><span className="k">Admin</span><h4>Curate + govern</h4><ul><li><b>CRUD</b> skills and categories</li><li><b>Protected</b> endpoints via RBAC</li><li><b>Shape</b> what learners can discover</li></ul></div>
            </div>
          )}
        />
      </CaseSection>

      <CaseSection num="05" kick="DECISIONS · CHALLENGE · OUTCOME" title="Built to stay fast and honest" lede="A difficulty model that feels helpful rather than patronizing, on queries that stay fast over normalized SQL.">
        <DecisionCards items={[
          { title: "Explainable scoring heuristics over an opaque ML model.", why: "Recommendations must be auditable — a learner should be able to ask why and get an answer.", tag: "Transparency" },
          { title: "Server-side rendering for fast first paint.", why: "A catalogue-style product should feel instant on first load, not after hydration.", tag: "Performance" },
          { title: "Defense-in-depth HTTP practices throughout.", why: "Helmet, compression, rate limiting and a MySQL-backed session store — production habits on a student-scale app.", tag: "Hardening" },
        ]} />
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "" },
          { k: "Constraint", v: "Normalized SQL must answer ranking queries quickly; progression must feel respectful." },
          { k: "Decision", v: "Three-signal heuristic scoring with parameterized queries throughout." },
          { k: "Trade-off", v: "Heuristics over ML — transparent but less adaptive to subtle patterns." },
          { k: "Outcome", v: project.results ?? "" },
        ]} />
        {project.securityNotes && <SecurityStrip items={project.securityNotes.split(" · ")} />}
        <StatusScale
          items={[
            { k: "Built", v: "Scoring engine + MVC app" },
            { k: "Working", v: "Ranked paths live" },
            { k: "Verified", v: "npm test + check scripts" },
            { k: "Limited", v: "Heuristic, not adaptive" },
            { k: "Future", v: "Progress tracking" },
          ]}
          active={[0, 1, 2]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

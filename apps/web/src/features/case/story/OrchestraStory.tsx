import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, EmpathyMap, FlowIcon, HScroll, PipeFlow, Reveal, StatusScale } from "../visuals";

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

export function OrchestraStory({ project }: { project: PublicProject }) {
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

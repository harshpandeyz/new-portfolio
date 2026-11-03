const ROUTE_SIGNALS = ["Health", "Context", "Budget", "Latency"];
const PROVIDERS = ["OpenRouter", "OpenAI", "Anthropic"];

/** A compact, repository-grounded view of OrchestraAI's execution path. */
export function HeroAtlas() {
  return (
    <figure className="hero-atlas" role="img" aria-label="OrchestraAI runtime: task and context feed model routing; provider execution coordinates isolated tools, PostgreSQL, Redis, telemetry and a replayable SSE stream before re-evaluation.">
      <figcaption className="runtime-map-head">
        <span className="runtime-map-mark" aria-hidden="true">O</span>
        <span><b>ORCHESTRAAI</b><small>RUNTIME CONTROL PLANE</small></span>
        <span className="runtime-map-mode">LIVE / DEMO</span>
      </figcaption>

      <div className="runtime-map-flow">
        <div className="runtime-map-node"><span>01 / INTAKE</span><b>Task</b><small>intent + tenant</small></div>
        <span className="runtime-map-arrow" aria-hidden="true">→</span>
        <div className="runtime-map-node"><span>02 / CONTEXT</span><b>Plan</b><small>build + compress</small></div>
      </div>

      <div className="runtime-map-router">
        <div className="runtime-map-router-title"><span>03 / DECISION</span><b>Model router</b><small>health · context · budget · latency</small></div>
        <div className="runtime-map-signals" aria-label="Routing signals">
          {ROUTE_SIGNALS.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
        <div className="runtime-map-provider-label">PROVIDER REGISTRY</div>
        <div className="runtime-map-providers">{PROVIDERS.map((provider) => <span key={provider}>{provider}</span>)}</div>
      </div>

      <div className="runtime-map-outputs">
        <div><span className="runtime-map-output-icon" aria-hidden="true">↗</span><b>Tools</b><small>isolated worker</small></div>
        <div><span className="runtime-map-output-icon" aria-hidden="true">⌂</span><b>State</b><small>Postgres · Redis</small></div>
        <div><span className="runtime-map-output-icon" aria-hidden="true">≈</span><b>Events</b><small>SSE · replay</small></div>
      </div>

      <div className="runtime-map-footer"><span>CHECKPOINT</span><i aria-hidden="true" /><b>RE-EVALUATE → COMPLETE</b></div>
      <div className="runtime-map-note"><span className="runtime-map-dot" /> Durable state · isolated tools · observable execution</div>
    </figure>
  );
}

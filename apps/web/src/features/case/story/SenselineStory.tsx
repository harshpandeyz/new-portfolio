import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, FlowIcon, HScroll, PipeFlow, StatusScale } from "../visuals";

const TASKS: [string, string, string][] = [
  ["S01", "Raw sensor interpretation", "Signedness · byte order · width · scaling · sentinels · malformed frames"],
  ["S02", "Physical-unit integrity", "Affine conversion · dimensional compatibility · canonical units · rounding"],
  ["S03", "Calibration + environment", "Gain/offset order · temperature correction · invalid or repeated correction"],
  ["S04", "Calibration applicability", "Instrument/measurand match · status · dates · range · uncertainty · traceability"],
  ["S05", "Uncertainty propagation", "Type A/B inputs · sensitivities · correlation · PSD checks · coverage factor"],
  ["S06", "Conformity decisions", "Uncertainty intervals · inclusive limits · malformed limits · unsafe acceptance"],
  ["S07", "Temporal + data integrity", "Stale/future data · clock skew · duplicates · reordering · uint32 rollover"],
  ["S08", "End-to-end integrity", "Decode · time · units · calibration · uncertainty · evidence · final decision"],
];

const HIDDEN_COUNTS = "S01 32 · S02 30 · S03 30 · S04 37 · S05 30 · S06 30 · S07 32 · S08 45";
const FIXTURE_COUNTS = [32, 30, 30, 37, 30, 30, 32, 45] as const;

function FixtureDistribution() {
  return (
    <div className="cs-fixture-chart" role="img" aria-label="266 hidden fixtures distributed across eight tasks: S01 32, S02 30, S03 30, S04 37, S05 30, S06 30, S07 32, S08 45.">
      <div className="cs-fixture-chart-head"><span>HIDDEN FIXTURES</span><b>266 TOTAL</b></div>
      <div className="cs-fixture-bars" aria-hidden="true">
        {FIXTURE_COUNTS.map((count, index) => (
          <div className="cs-fixture-bar" key={index}>
            <b>{count}</b>
            <span><i style={{ height: `${(count / 45) * 100}%` }} /></span>
            <small>S0{index + 1}</small>
          </div>
        ))}
      </div>
      <p>Fixture count by task · bar height is proportional to count</p>
      <ol className="sr-only">{FIXTURE_COUNTS.map((count, index) => <li key={index}>S0{index + 1}: {count} fixtures</li>)}</ol>
    </div>
  );
}

export function SenselineStory({ project }: { project: PublicProject }) {
  return (
    <>
      <CaseSection num="01" kick="BENCHMARK AT A GLANCE" title="Does the meaning survive the pipeline?" lede="SENSELINE asks whether an AI coding agent preserves the physical meaning of sensor data — from raw register bytes through calibration and uncertainty to a safe engineering decision. Deterministic, synthetic, and scored against explicit contracts.">
        <Canvas kicker="MEASUREMENT-INTEGRITY LOOP" right="S01 → S08 · SCR · UAR" caption={<><b>Read it left to right:</b> decode once, convert once, calibrate once — then propagate uncertainty and decide. The grader checks every stage, not just the final answer.</>}>
          <PipeFlow nodes={[
            { label: "Decode", sub: "S01 · bytes", icon: "documents" },
            { label: "Units", sub: "S02 · dimensions", icon: "api", hot: true },
            { label: "Calibrate", sub: "S03–S04 · evidence", icon: "brain", hot: true, state: true },
            { label: "Propagate", sub: "S05 · uncertainty", icon: "ledger" },
            { label: "Decide", sub: "S06–S07 · verdict", icon: "attest", hot: true },
            { label: "End-to-end", sub: "S08 · full chain", icon: "shield" },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Hidden fixtures</span><span className="lv"><b>266 cases</b> — {HIDDEN_COUNTS}. S08 covers both conversion directions, signed decoding, correlated uncertainty and simultaneous failures.</span></div>
            <div className="cs-lane"><span className="lk">Task package</span><span className="lv">Each task ships its <b>spec, input/output JSON Schemas, public examples and an unimplemented starter</b>. Fixtures, expected outputs, grader code and mutations are never exported.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="02" kick="TASK MATRIX" title="Eight tasks, one chain of custody" lede="Each task isolates a failure family; S08 fuses them. The risks column is what the grader is hunting for.">
        <FixtureDistribution />
        <table className="cs-matrix" aria-label="SENSELINE task matrix">
          <thead><tr><th>Task</th><th>Focus</th><th>Failure families exercised</th></tr></thead>
          <tbody>
            {TASKS.map(([id, focus, risks]) => (
              <tr key={id}><td>{id}</td><td>{focus}</td><td>{risks}.</td></tr>
            ))}
          </tbody>
        </table>
        <p className="cs-note">S08 FIXED CONTRACT — decode and scale into the input unit, convert once to the final unit, calibrate once, then evaluate an uncertainty budget already supplied after calibration. Gain is dimensionless, offset is in the final unit, certificate uncertainty is checked but never added.</p>
      </CaseSection>

      <CaseSection num="03" kick="EVALUATION ARCHITECTURE" title="Three independent judges" lede="Reference implementations, a numerical oracle that imports no reference code, and a grader that applies schemas, exact semantic checks and field-specific tolerances.">
        <Canvas kicker="TRIPLE-CHECK TOPOLOGY" right="REFERENCE · ORACLE · GRADER">
          <HScroll label="Evaluation: reference and oracle implement independently, grader scores candidates, mutations probe the grader">
            <div className="cs-flow" aria-hidden="true">
              {[["Reference", "implementations"], ["Oracle", "no shared code"], ["Grader", "schemas + checks"], ["Controls", "30 mutations"], ["Score", "SCR · UAR"]].map(([b, s], i, a) => (
                <div key={b} style={{ display: "contents" }}>
                  <div className={`cs-node${i === 2 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={["documents", "brain", "search", "shield", "attest"][i]} /></span><b>{b}</b><span>{s}</span></div>
                  {i < a.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Oracle independence</span><span className="lv"><b>oracle/compute.py imports no reference code</b> — reference/oracle agreement validates both, not one echoing the other.</span></div>
            <div className="cs-lane"><span className="lk">Adversarial controls</span><span className="lv"><b>30 documented defective controls in mutations/</b> must fail for their intended dimensions — they prove the grader can actually catch each family.</span></div>
            <div className="cs-lane"><span className="lk">Isolation fails closed</span><span className="lv">Fresh container per case on the <b>pinned Python 3.11.18 image</b>: no network, non-root UID, dropped capabilities, read-only filesystems, wall timeout. Missing Docker never falls back to host Python.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="04" kick="SCORING" title="Two headline rates, honestly pooled" lede="Silent corruption and unsafe acceptance — counted by case, never averaged across incompatible dimensions.">
        <Split
          left={<><h3>Silent Corruption Rate</h3><p><b>SCR = corrupted cases / all evaluated hidden cases.</b> A case corrupts when a candidate claims a result is valid or ACCEPT while returning a wrong or unparseable expected physical value, an incompatible unit/value pair, a promoted false validity state, or ACCEPT where the disposition is not ACCEPT. A missing required unit on a numerically correct result is a contract failure but excluded from SCR; harmless schema-only slips and physically equivalent non-canonical values never count alone.</p><p><b>UAR = false ACCEPTs / all non-ACCEPT S06+S08 cases</b>, including invalid S06 cases without a disposition.</p></>}
          right={(
            <Canvas kicker="REPORTED SEPARATELY" right="NO POOLED DIMENSIONS">
              <PipeFlow nodes={[
                { label: "Schema", sub: "contract", icon: "documents" },
                { label: "Numeric", sub: "correctness", icon: "brain" },
                { label: "Units", sub: "equivalence", icon: "api", hot: true, state: true },
                { label: "Validity", sub: "state accuracy", icon: "shield" },
                { label: "Decision", sub: "ACCEPT safety", icon: "attest", hot: true },
                { label: "SCR·UAR", sub: "headline rates", icon: "ledger" },
              ]} />
            </Canvas>
          )}
        />
        <p className="cs-note">SCHEMA, STRICT FUNCTIONAL CORRECTNESS, NUMERIC CORRECTNESS, PHYSICAL-UNIT CORRECTNESS AND EQUIVALENCE, MISSING-UNIT INTEGRITY, VALIDITY ACCURACY, DECISION ACCURACY, FALSE REJECTION, RUNTIME FAILURES AND MALFORMED RESPONSES ARE ALL REPORTED SEPARATELY. NUMERICAL ERRORS ARE GROUPED BY TASK, FIELD AND UNIT.</p>
      </CaseSection>

      <CaseSection num="05" kick="VALIDATED · NOT RUN" title="What is proven — and what isn't" lede="The infrastructure and its reproducibility validation are complete. No model was ever tested against it. Both statements are load-bearing.">
        <div className="cs-compare">
          <div className="cs-cmp cs-cmp--hi"><span className="k">Complete — validated in this release</span><h4>Infrastructure + reproducibility</h4><ul><li><b>104 tests pass</b> (11.73s), validate suite green</li><li><b>266 isolated reference cases</b> validated</li><li><b>All 30 mutations rejected</b> for intended dimensions</li><li><b>Docker isolation 12/12</b>, agent workspace checks pass</li><li><b>Full validate ≈ 7m 38s</b> on the release machine</li></ul></div>
          <div className="cs-cmp"><span className="k">Not run — blocked, not failed (2026-11-02)</span><h4>Model experiments</h4><ul><li><b>No model IDs selected</b>, no spend/owner caps recorded</li><li><b>Zero inference calls</b> — no scores, transcripts, runtimes or costs</li><li><b>Planned:</b> 9-trial pilot (S01/S05/S08), then reviewed 72-trial full run</li><li><b>Blockers:</b> isolated credentials + approved caps required first</li><li><b>Video:</b> to be added by participant</li></ul></div>
        </div>
        <StatusScale
          items={[
            { k: "Built", v: "8 tasks + harness" },
            { k: "Checked", v: "oracle + grader + mutations" },
            { k: "Validated", v: "266 cases · 30 rejected" },
            { k: "Not run", v: "no model trials" },
            { k: "Future", v: "pilot → full, on approval" },
          ]}
          active={[0, 1, 2]}
        />
        <p className="cs-note">DELIBERATELY DEFECTIVE CONTROLS ARE VALIDATION FIXTURES, NOT OBSERVED MODEL FAILURES. FAILURE_ANALYSIS DOCUMENTS MUTATION COVERAGE — THERE IS NO EMPIRICAL MODEL FAILURE ANALYSIS BECAUSE NO MODEL RAN.</p>
      </CaseSection>

      <CaseSection num="06" kick="TECHNICAL DECISIONS" title="Five load-bearing choices" lede="Each decision pairs the choice with the reason — no plain numbered list.">
        <DecisionCards items={[
          { title: "Oracle imports no reference code.", why: "Agreement between two independent implementations validates both — one can never echo the other's bug.", tag: "Independence" },
          { title: "Thirty defective controls must fail for their intended dimensions.", why: "Mutations prove the grader detects each failure family instead of asserting it in prose.", tag: "Adversarial" },
          { title: "Isolation fails closed, never degrades.", why: "A missing Docker image reports failure rather than silently running candidates on the host.", tag: "Integrity" },
          { title: "Bounded metrology scope, stated up front.", why: "Simplified task rules with no hardware, compliance or safety claims — the benchmark measures code, not laboratories.", tag: "Scope" },
          { title: "SCR and UAR pooled by case, split by task.", why: "One corrupted verdict per case; incompatible dimensions are never averaged together.", tag: "Metrics" },
        ]} />
      </CaseSection>

      <CaseSection num="07" kick="CHALLENGE · LIMITS · OUTCOME" title="Hard parts, honestly" lede="Field-specific tolerances without pooling incompatible dimensions, and workspaces that keep credentials away from candidates.">
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "" },
          { k: "Constraint", v: "Tolerances must stay field-specific; agent credentials must never reach candidate containers." },
          { k: "Decision", v: "Per-field tolerances in the grader; task-only workspaces with solution.py edits only." },
          { k: "Trade-off", v: "Synthetic data and simplified rules bound realism — stated, not hidden." },
          { k: "Outcome", v: project.results ?? "" },
        ]} />
        <div className="cs-factgrid">
          <div className="cs-fact"><span className="k">Run it</span><div className="t">make test · validate · security-test</div><p className="d">Pinned Python 3.11, jsonschema 4.23.0, pytest 8.3.5. Export any task with harness.export_task; full runs need --execute plus spend controls.</p></div>
          <div className="cs-fact"><span className="k">Prior work</span><div className="t">Narrow scope, no first-of-kind claim</div><p className="d">EngiBench, IoT-SkillsBench, closed-loop embedded evaluation, Vibe-FDTR; NIST TN 1297, GUM, ILAC G8 and ISO/IEC 17025 inform the simplified rules only.</p></div>
          <div className="cs-fact"><span className="k">Provenance</span><div className="t">Codex-assisted, reviews pending</div><p className="d">Codex assisted implementation and docs. Owner review and independent metrology review are not completed or claimed.</p></div>
        </div>
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

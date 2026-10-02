import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, EmpathyMap, FlowIcon, HScroll, PipeFlow, Reveal, StatusScale } from "../visuals";

export function SkillStory({ project }: { project: PublicProject }) {
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

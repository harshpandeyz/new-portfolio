import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, EmpathyMap, FlowIcon, HScroll, PipeFlow, Reveal, StatusScale } from "../visuals";

export function QuantumStory({ project }: { project: PublicProject }) {
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

import type { PublicProject } from "@hp/shared";

import { TechStrip } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, FlowIcon, HScroll, PipeFlow, SecurityStrip, StatusScale } from "../visuals";

/**
 * The 2024–25 capstone and CCTV-X are deliberately separate records. This
 * story only describes the original repository's YOLOv8 / Ethereum design;
 * it does not borrow the successor's OpenTimestamps topology or UI imagery.
 */
export function MobSurveillanceStory({ project }: { project: PublicProject }) {
  return (
    <>
      <CaseSection
        num="01"
        kick="PROJECT LINEAGE"
        title="The capstone that preceded CCTV-X"
        lede="This is the original Intelligent Mob Surveillance System: a YOLOv8 computer-vision pipeline paired with AES-256, SHA-256 and Ethereum anchoring. CCTV-X is a later, separately documented successor—not a renamed version of this repository."
      >
        <div className="cs-compare">
          <div className="cs-cmp cs-cmp--hi">
            <span className="k">This repository · 2024—2025</span>
            <h4>Mob Surveillance System</h4>
            <ul>
              <li><b>YOLOv8 + OpenCV + MediaPipe</b> for live crowd and mob signals.</li>
              <li><b>Solidity + Web3.py</b> to record evidence hashes on Ethereum, with Ganache in development.</li>
              <li><b>FastAPI, MongoDB and React/Vite</b> for the authenticated operating surface.</li>
            </ul>
          </div>
          <div className="cs-cmp">
            <span className="k">Later repository · separately documented</span>
            <h4>CCTV-X / Intelligent Surveillance System</h4>
            <ul>
              <li>Uses a later RTSP/webcam/upload pipeline and a different evidence architecture.</li>
              <li>Its OpenTimestamps and append-only hash-ledger claims belong only to that successor.</li>
              <li>Its four product screenshots are intentionally not reused here.</li>
            </ul>
          </div>
        </div>
      </CaseSection>

      <CaseSection
        num="02"
        kick="VIDEO PROCESSING"
        title="From a camera feed to a reviewable event"
        lede="The original detection path is deliberately shown as an engineering workflow, not a claim of a trained violence classifier."
      >
        <Canvas kicker="ORIGINAL CV WORKFLOW" right="YOLOV8 · OPENCV · MEDIAPIPE" caption={<><b>Operational intent:</b> detect a crowd event, extract the supporting clip, then preserve enough metadata for an operator to review it.</>}>
          <PipeFlow nodes={[
            { label: "CCTV feed", sub: "live video", icon: "camera" },
            { label: "Detect", sub: "YOLOv8 + OpenCV", icon: "brain", hot: true },
            { label: "Analyse", sub: "MediaPipe signals", icon: "search" },
            { label: "Mob event", sub: "threshold crossed", icon: "alert", hot: true, state: true },
            { label: "Extract", sub: "evidence clip", icon: "evidence" },
            { label: "Review", sub: "authenticated UI", icon: "user" },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Detection</span><span className="lv"><b>YOLOv8, OpenCV and MediaPipe</b> turn video frames into person and crowd signals before an event is raised.</span></div>
            <div className="cs-lane"><span className="lk">Operator boundary</span><span className="lv">A raised event is evidence for review—not an automated judgement about people or a claim of production surveillance accuracy.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection
        num="03"
        kick="EVIDENCE INTEGRITY"
        title="Seal the clip, then anchor its digest"
        lede="The original implementation encrypts and hashes the artifact before recording its digest through a Solidity contract. The chain records integrity evidence, not the video itself."
      >
        <Canvas kicker="EVIDENCE → ETHEREUM" right="AES-256 · SHA-256 · WEB3.PY" caption={<><b>Evidence remains off-chain:</b> the encrypted clip and metadata stay in the application store while the SHA-256 digest is committed through the smart contract. Ganache supplies the development-chain environment.</>}>
          <PipeFlow nodes={[
            { label: "Clip", sub: "event artifact", icon: "evidence" },
            { label: "Encrypt", sub: "AES-256", icon: "shield", hot: true },
            { label: "Digest", sub: "SHA-256", icon: "ledger", hot: true, state: true },
            { label: "Web3.py", sub: "contract call", icon: "api" },
            { label: "Solidity", sub: "hash record", icon: "attest" },
            { label: "Ethereum", sub: "Ganache in dev", icon: "search" },
          ]} />
        </Canvas>
        <SecurityStrip items={["AES-256 evidence encryption", "SHA-256 integrity hashing", "Solidity contract anchoring", "JWT dashboard authentication"]} />
      </CaseSection>

      <CaseSection
        num="04"
        kick="SYSTEM TOPOLOGY"
        title="Services with clear boundaries"
        lede={project.architecture ?? undefined}
      >
        <Canvas kicker="DOCKER COMPOSE TOPOLOGY" right="FASTAPI · MONGODB · REACT" caption="The dashboard reads detections and metadata from the application boundary; on-chain writes are a separate integrity step instead of a substitute for the operational database.">
          <HScroll label="Original Mob Surveillance System topology: camera feed, detection service, FastAPI, MongoDB, Ethereum contract and React dashboard">
            <div className="cs-flow" aria-hidden="true">
              {[
                ["Camera", "CCTV input", "camera"],
                ["Vision", "YOLOv8 + OpenCV", "brain"],
                ["API", "FastAPI", "api"],
                ["Store", "MongoDB metadata", "ledger"],
                ["Contract", "Solidity + Web3.py", "attest"],
                ["Chain", "Ethereum / Ganache", "shield"],
                ["Dashboard", "React + Vite", "web"],
              ].map(([label, sub, icon], index, all) => (
                <div key={label} style={{ display: "contents" }}>
                  <div className={`cs-node${index === 1 || index === 4 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={icon} /></span><b>{label}</b><span>{sub}</span></div>
                  {index < all.length - 1 && <span className="cs-link flowline" />}
                </div>
              ))}
            </div>
          </HScroll>
        </Canvas>
      </CaseSection>

      <CaseSection
        num="05"
        kick="ENGINEERING DECISIONS"
        title="Integrity was designed into the hand-off"
        lede="The project combines an application database with an independently checkable hash record; neither is presented as a substitute for careful evidence handling."
      >
        <DecisionCards items={[
          { title: "Anchor the evidence digest, not raw video, through Solidity and Web3.py.", why: "A digest gives a later verifier a tamper-evident reference without placing large video artifacts on-chain.", tag: "Integrity" },
          { title: "Encrypt and hash before storage.", why: "AES-256 protects the artifact while SHA-256 gives the chain record a stable value to verify.", tag: "Evidence" },
          { title: "Use FastAPI for the service boundary.", why: "The project gains asynchronous endpoints and generated API documentation around inference and evidence operations.", tag: "API" },
          { title: "Package the service set with Docker and Jenkins.", why: "The application, database and deployment path can be exercised as a repeatable set of services.", tag: "Delivery" },
        ]} />
      </CaseSection>

      <CaseSection
        num="06"
        kick="LIMITS · OUTCOME"
        title="A capstone foundation, stated precisely"
        lede="The core challenge was synchronising a blockchain write with offline evidence storage while keeping live analysis feasible on consumer hardware."
      >
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "Synchronising integrity writes with evidence storage." },
          { k: "Constraint", v: "A live camera path, a database record and a chain transaction must not contradict each other." },
          { k: "Decision", v: "Encrypt and hash the clip, retain metadata in MongoDB, then anchor the digest through Web3.py." },
          { k: "Trade-off", v: "On-chain anchoring adds a separate asynchronous dependency and does not itself validate detection quality." },
          { k: "Outcome", v: project.results ?? "Foundation for the separately documented CCTV-X successor." },
        ]} />
        <StatusScale
          items={[
            { k: "Built", v: "Vision + evidence path" },
            { k: "Integrated", v: "FastAPI + MongoDB + dashboard" },
            { k: "Anchored", v: "Ethereum digest record" },
            { k: "Limited", v: "Consumer-hardware latency" },
            { k: "Evolved", v: "CCTV-X successor" },
          ]}
          active={[0, 1, 2, 4]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}

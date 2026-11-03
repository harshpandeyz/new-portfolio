import { SectionHeader } from "../../components/ui/SectionHeader";
import { IconArrowRight, IconExternal } from "../../components/ui/icons";

/**
 * Open Source — the externally-verified record. Every claim here is
 * independently checkable: the XERJ Corpus Hub contributor page (live,
 * pinned, licence-cleared) and the public repositories themselves.
 * Nothing is listed that cannot be opened and confirmed.
 */
export function OpenSource() {
  return (
    <section className="section oss-section" id="opensource" aria-label="Open source">
      <div className="container">
        <SectionHeader
          eyebrow="Open source"
          title="Work others build on."
          sub="Independently verifiable contributions — selected commits, indexed corpora and public repositories."
          inline
        />

        <div className="oss-grid">
          <article className="oss-card oss-card--lead">
            <div className="oss-top">
              <span className="oss-index">01</span>
              <span className="oss-badge">CORPUS HUB · VERIFIED</span>
            </div>
            <h3>XERJ Corpus Hub contributor</h3>
            <p className="oss-desc">
              Harsh&rsquo;s work was selected for the XERJ Corpus Hub — the open reference memory
              AI coding agents search before they write code. When an agent meets the same
              problem, it gets this implementation back as a worked example, with the author
              and repository attached.
            </p>
            <dl className="oss-facts">
              <div><dt>Corpus</dt><dd>harshpandeyz–orchestraai · AI, prompts and agents</dd></div>
              <div><dt>Selected commit</dt><dd><code>5394dfc78b</code> — snapshot tool via DEMO mock + SSRF-guarded fetch</dd></div>
              <div><dt>Scope</dt><dd>7 files · 465 lines · whole repo indexed at pin <code>b8d5e262</code></dd></div>
              <div><dt>Since</dt><dd>Contributor since 2026-10-16 · licence-cleared (ISC)</dd></div>
            </dl>
            <div className="oss-actions">
              <a
                className="btn btn-solid"
                href="https://hub.xerj.org/contributors/harshpandeyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify on the hub <IconExternal />
              </a>
              <a
                className="oss-link"
                href="https://github.com/harshpandeyz/OrchestraAI"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source repository <IconArrowRight />
              </a>
            </div>
          </article>

          <article className="oss-card">
            <div className="oss-top">
              <span className="oss-index">02</span>
              <span className="oss-badge">PUBLIC REPOSITORIES</span>
            </div>
            <h3>Build in the open</h3>
            <p className="oss-desc">
              Agent runtimes, evaluation benchmarks, vision pipelines and mobile builds —
              every case study on this page traces back to a repository you can read.
            </p>
            <ul className="oss-repos">
              <li>
                <a href="https://github.com/harshpandeyz/OrchestraAI" target="_blank" rel="noopener noreferrer">
                  <b>OrchestraAI</b><span>Adaptive agent runtime</span>
                </a>
              </li>
              <li>
                <a href="https://github.com/harshpandeyz/SENSELINE" target="_blank" rel="noopener noreferrer">
                  <b>SENSELINE</b><span>Sensor-semantics benchmark</span>
                </a>
              </li>
              <li>
                <a href="https://github.com/harshpandeyz/ShopSphere" target="_blank" rel="noopener noreferrer">
                  <b>ShopSphere</b><span>Offline demo store</span>
                </a>
              </li>
              <li>
                <a href="https://github.com/harshpandeyz/Intelligent-Mob-Surveillance-System" target="_blank" rel="noopener noreferrer">
                  <b>Mob Surveillance</b><span>Capstone predecessor</span>
                </a>
              </li>
            </ul>
            <div className="oss-actions">
              <a
                className="oss-link"
                href="https://github.com/harshpandeyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                All repositories <IconArrowRight />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

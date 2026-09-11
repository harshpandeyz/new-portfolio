import { ContactChannels } from "./ContactChannels";
import { ContactForm } from "./ContactForm";
import { IconArrowRight } from "../../components/ui/icons";
import { useData } from "../../lib/data";

export interface ContactProps {
  onViewResume: () => void;
}

/**
 * Contact as a balanced editorial panel: centered heading, two equal
 * columns (channels / message form), and a quiet closing strip.
 * All destinations, links, résumé handling and form logic live in the
 * child components — this file only owns layout.
 */
export function Contact({ onViewResume }: ContactProps) {
  const { publicSettings } = useData();
  return (
    <section className="section contact-section" id="contact" aria-label="Contact">
      <div className="container contact-container">
        <div className="contact-head" data-reveal>
          <span className="contact-eyebrow">Contact</span>
          <h2 className="contact-title">
            Let&rsquo;s build something <span className="contact-title-accent">meaningful.</span>
          </h2>
          <p className="contact-sub">A project, a role, or just an interesting problem — I&rsquo;d love to talk.</p>
          <p className="contact-quote" aria-hidden="true">
            <span className="contact-quote-text">&ldquo;Good systems start with good conversations.&rdquo;</span>
            <span className="contact-quote-by">— Harsh Pandey</span>
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-panel" data-reveal>
            <div className="contact-panel-head">
              <span className="eyebrow">Get in touch</span>
              <p>Different ways to reach me. Choose what works best for you.</p>
            </div>
            <ContactChannels onViewResume={onViewResume} />
          </div>

          <div className="contact-panel" data-reveal>
            <div className="contact-panel-head">
              <span className="eyebrow">Send a message</span>
              <p>Share a bit about what you have in mind. The more context, the better.</p>
            </div>
            {publicSettings?.contactEnabled === false ? <p className="contact-unavailable" role="status">The contact form is temporarily unavailable. Please use one of the direct channels instead.</p> : <ContactForm />}
          </div>
        </div>

        <div className="contact-foot" data-reveal>
          <p className="contact-mantras" aria-label="Build, learn, collaborate, create impact">
            <span>Build</span>
            <span aria-hidden="true">·</span>
            <span>Learn</span>
            <span aria-hidden="true">·</span>
            <span>Collaborate</span>
            <span aria-hidden="true">·</span>
            <span>Create impact</span>
          </p>
          <span className="contact-foot-rule" aria-hidden="true" />
          <span className="contact-foot-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <a
            className="contact-foot-link"
            href="#main"
            aria-label="Back to the top of the page"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("main")?.scrollIntoView({ behavior: "smooth" });
              window.history.replaceState(null, "", "#contact");
            }}
          >
            Let&rsquo;s connect <IconArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

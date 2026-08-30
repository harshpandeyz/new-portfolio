import { SectionHeader } from "../../components/ui/SectionHeader";
import { ContactChannels } from "./ContactChannels";
import { ContactForm } from "./ContactForm";

export interface ContactProps {
  onViewResume: () => void;
}

/**
 * Contact as a premium panel: direct channels first (WhatsApp is one obvious
 * action), message form second. Every channel keeps the visitor in context.
 */
export function Contact({ onViewResume }: ContactProps) {
  return (
    <section className="section contact-section" id="contact" aria-label="Contact">
      <div className="container">
        <SectionHeader
          eyebrow="Contact"
          title="Let's build something."
          sub="Have a project, a role, a collaboration, or an interesting problem? I'd love to talk."
        />

        <div className="contact-grid">
          <div className="contact-intro" data-reveal>
            <h3>Have an opportunity, project, or interesting problem?</h3>
            <p>The fastest way to reach me is one action away.</p>
            <ContactChannels onViewResume={onViewResume} />
          </div>

          <div className="contact-form-wrap" data-reveal>
            <div className="eyebrow">Or leave a message</div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
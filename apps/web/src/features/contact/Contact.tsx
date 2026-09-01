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
          sub="A project, a role, or just an interesting problem — I'd love to talk."
        />

        <div className="contact-grid">
          <div className="contact-intro" data-reveal>
            <h3>Say hi — the fastest way is one action away.</h3>
            <p>Prefer a message? The form is right there. Either way, I reply to people, not spam.</p>
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
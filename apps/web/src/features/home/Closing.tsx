import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";

export interface ClosingProps {
  onViewResume: () => void;
}

export function Closing({ onViewResume }: ClosingProps) {
  const navigate = useNavigate();
  return (
    <section className="closing-section" id="exit" aria-label="Next steps">
      <div className="container closing-inner" data-reveal>
        <span className="eyebrow">Have a good one</span>
        <h2>Thanks for taking a look.</h2>
        <p>If something here feels like the kind of work your team is doing, let's talk.</p>
        <div className="exit-cta">
          <Button href="#contact">Start a conversation</Button>
          <Button variant="secondary" onClick={onViewResume}>View résumé</Button>
          <Button variant="ghost" onClick={() => navigate("/recruiter")}>Recruiter view</Button>
        </div>
      </div>
    </section>
  );
}
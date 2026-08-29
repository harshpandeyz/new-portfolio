import { useNavigate } from "react-router-dom";
import { ACHIEVEMENTS } from "@hp/shared";
import { getAchievements } from "../../lib/achievements";

export function Closing() {
  const navigate = useNavigate();
  const unlocked = getAchievements();
  return <section className="closing-section" id="exit" aria-label="Next steps"><div className="container closing-inner" data-reveal>
    <span className="eyebrow">Have a good one</span><h2>Thanks for taking a look.</h2><p>If something here feels like the kind of work your team is doing, let’s talk.</p>
    <div className="exit-cta"><a className="btn btn-solid" href="#contact">Start a conversation <span>↗</span></a><button className="btn" onClick={() => navigate("/recruiter")}>Recruiter view <span>↗</span></button></div>
    {unlocked.length > 0 && <div className="exit-achievements" aria-label="Unlocked curiosities">{ACHIEVEMENTS.filter((achievement) => unlocked.includes(achievement.id)).map((achievement) => <span className="ach-chip unlocked" key={achievement.id}>✦ {achievement.title}</span>)}</div>}
  </div></section>;
}

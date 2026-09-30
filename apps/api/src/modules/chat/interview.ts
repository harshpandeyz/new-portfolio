import type { InterviewReply } from "@hp/shared";

import { buildKnowledge } from "./knowledge.js";
import { completeWithFallback, getLlmProviders, type LlmMessage } from "./llm.js";

/**
 * Interview mode — the assistant asks ONE question at a time about Harsh's
 * real work, reacts naturally to each answer, then follows up.
 * No scores, no rankings: just a grounded technical conversation.
 */

export interface InterviewTurn {
  role: "ai" | "user";
  text: string;
}

const OPENERS = [
  "Let's start with something concrete: which of Harsh's projects caught your eye, and what would you like to dig into first — the problem it solves, or how it was built?",
  "To warm up: Harsh works across backend systems, applied AI and full-stack products. Which of those directions interests you most, and why?",
  "First question: what kind of role or problem are you hiring for? That'll help me point you at the most relevant parts of Harsh's work.",
];

const FOLLOWUP_BANK: { match: RegExp; question: string; reaction: string }[] = [
  {
    match: /surveillance|cctv|yolo|detection|evidence|blockchain|crowd|mob/i,
    question:
      "Good — the surveillance work is where evidence integrity meets real-time inference. What would you probe next: how the detection pipeline stays real-time, or how the evidence chain makes tampering detectable?",
    reaction:
      "Nice pick — that's the deepest system in the portfolio, and the honest-limitations notes are worth reading closely.",
  },
  {
    match: /rag|quantum|llm|agent|orchestra|embedding|vector|faiss|chat|ai/i,
    question:
      "The AI systems here are grounded by design — retrieval first, generation second. Would you like to go deeper on the RAG grounding approach, or on how the agent runtime routes between models?",
    reaction: "Good instinct — grounded generation is the thread connecting those projects.",
  },
  {
    match: /backend|api|node|express|spring|fastapi|postgres|mysql|mongo|database|rest/i,
    question:
      "Backend depth is a fair lens. Next: are you more interested in API and data-model design decisions, or in auth, reliability and operational concerns?",
    reaction: "Solid — the backend work here is deliberately explainable, not magic.",
  },
  {
    match: /frontend|react|ui|design|mobile|ios|swift|css/i,
    question:
      "Frontend craft matters here too. Should we talk about a specific interface — say the investigation dashboard — or about how Harsh keeps scope small and finishes?",
    reaction: "Fair — shipping finished interfaces is a real signal.",
  },
  {
    match: /devops|docker|ci|jenkins|deploy|cloud|caddy/i,
    question:
      "Deployment is where demos go to die. Want to dig into the containerized delivery setup, or the HTTPS and reverse-proxy story?",
    reaction: "Exactly the right skepticism — delivery is part of the engineering.",
  },
  {
    match: /intern|codsoft|experience|team|hackathon|idea|lead/i,
    question:
      "Experience questions are welcome. Would you like to hear how the internship work connects to later systems, or what the hackathon wins actually demonstrate?",
    reaction: "Good — trajectory matters more than any single line on a résumé.",
  },
  {
    match: /secur|auth|jwt|encrypt|hash|csrf/i,
    question:
      "Security is treated as architecture here, not a checklist. Next: evidence integrity and chain-of-custody, or web auth hardening — which is more relevant to you?",
    reaction: "Right question — both threads run through the flagship work.",
  },
];

const GENERIC_FOLLOWUPS = [
  "Interesting — can you say a bit more about what matters most to you there? I'll point you at the exact part of the portfolio that answers it.",
  "Got it. One level deeper: is that a question about how it was built, or about what it proves Harsh can do next?",
  "Understood. If you were interviewing Harsh tomorrow, what would your hardest follow-up question be?",
];

function pickOpener(historyLength: number): string {
  return OPENERS[historyLength % OPENERS.length]!;
}

function deterministicTurn(history: InterviewTurn[]): { reaction: string | null; question: string; done: boolean } {
  const userAnswers = history.filter((t) => t.role === "user").map((t) => t.text).join("\n");
  if (history.length === 0) {
    return { reaction: null, question: pickOpener(0), done: false };
  }
  const lastAnswer = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  for (const item of FOLLOWUP_BANK) {
    if (item.match.test(lastAnswer) || item.match.test(userAnswers)) {
      // Avoid repeating the same follow-up twice in a row.
      const lastAi = [...history].reverse().find((t) => t.role === "ai")?.text ?? "";
      if (lastAi !== item.question) return { reaction: item.reaction, question: item.question, done: false };
    }
  }
  const turn = Math.floor(history.length / 2);
  if (turn >= 8) {
    return {
      reaction: "Thanks — that's a solid run through the important ground.",
      question: "We've covered a lot. The case studies and the recruiter view have everything we discussed, with links. Anything else you'd like to close on?",
      done: true,
    };
  }
  return { reaction: "Noted — thanks, that's helpful context.", question: GENERIC_FOLLOWUPS[turn % GENERIC_FOLLOWUPS.length]!, done: false };
}

const INTERVIEW_SYSTEM = `You are conducting a grounded technical interview ABOUT Harsh Pandey's portfolio, on his portfolio site.
You ask exactly ONE question per turn. Rules:
- Ground every question in the provided portfolio context. Never invent employers, metrics, or experience.
- React to the candidate's last answer in one natural sentence, then ask one relevant follow-up.
- Keep turns short (max ~80 words total). Conversational, precise, no corporate filler.
- Never output scores, grades, rankings or verdicts.
- If the user says stop/done/bye, acknowledge warmly and close with no new question.`;

export async function interviewTurn(history: InterviewTurn[], lastAnswer: string | null): Promise<InterviewReply> {
  const docs = await buildKnowledge();
  const context = docs
    .slice(0, 40)
    .map((d) => `(${d.kind}) ${d.title}: ${d.content.slice(0, 500)}`)
    .join("\n");

  const transcript = history
    .slice(-12)
    .map((t) => `${t.role === "ai" ? "Interviewer" : "Candidate"}: ${t.text.slice(0, 800)}`)
    .join("\n");

  const providers = await getLlmProviders();
  if (providers.length > 0) {
    const messages: LlmMessage[] = [
      { role: "system", content: INTERVIEW_SYSTEM },
      {
        role: "user",
        content: `Portfolio context:\n${context.slice(0, 12000)}\n\nTranscript so far:\n${transcript || "(new interview)"}\n${lastAnswer ? `\nCandidate's latest answer: ${lastAnswer.slice(0, 1500)}` : "\nBegin the interview with an opening question."}\n\nRespond as JSON only: {"reaction": "..." or null, "question": "..." or null, "done": true/false}`,
      },
    ];
    try {
      const { text, provider } = await completeWithFallback(messages, { maxTokens: 300, temperature: 0.5 });
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as {
        reaction?: string | null;
        question?: string | null;
        done?: boolean;
      };
      const done = Boolean(parsed.done) || !parsed.question;
      return {
        question: typeof parsed.question === "string" && parsed.question.trim() ? parsed.question.trim().slice(0, 1000) : null,
        reaction: typeof parsed.reaction === "string" && parsed.reaction.trim() ? parsed.reaction.trim().slice(0, 600) : null,
        done,
        turn: Math.floor(history.length / 2) + 1,
        provider,
      };
    } catch {
      // fall through to deterministic bank
    }
  }

  const det = deterministicTurn(history);
  // If caller supplied an answer, count it; start has no reaction.
  void lastAnswer;
  return {
    question: det.question,
    reaction: det.reaction,
    done: det.done,
    turn: Math.floor(history.length / 2) + 1,
    provider: "knowledge-base",
  };
}

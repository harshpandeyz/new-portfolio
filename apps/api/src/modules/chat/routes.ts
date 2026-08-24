import type { FastifyInstance } from "fastify";
import { chatSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { clientIp, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { answerQuestion } from "./engine.js";

const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX = 12;

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (req, reply) => {
    const limit = rateLimit(`chat:${clientIp(req)}`, CHAT_MAX, CHAT_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      return reply.code(429).send({ error: "RATE_LIMITED", message: "The intelligence core needs a moment. Try again shortly." });
    }

    const { message } = parseBody(req, chatSchema);
    const reply_ = await answerQuestion(message);

    void prisma.chatQueryLog
      .create({ data: { question: message.slice(0, 500), confidence: reply_.confidence, provider: reply_.provider } })
      .catch(() => undefined);
    void prisma.analyticsEvent
      .create({ data: { type: "chat_query", ref: reply_.confidence } })
      .catch(() => undefined);

    return reply_;
  });

  app.get("/suggestions", async () => {
    return {
      suggestions: [
        "Who is Harsh?",
        "Show me his strongest project",
        "Explain the surveillance system",
        "What technologies does he use?",
        "What is he currently learning?",
        "What certificates does Harsh have?",
        "Where did Harsh study?",
        "How can I contact Harsh?",
      ],
    };
  });
}

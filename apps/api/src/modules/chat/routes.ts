import type { FastifyInstance } from "fastify";
import { chatSchema } from "@hp/shared";

import { clientIp, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { answerQuestion } from "./engine.js";
import { getSiteSettings } from "../settings/store.js";
import { trackAnalyticsEvent } from "../analytics/track.js";

const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX = 12;

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (req, reply) => {
    if (!(await getSiteSettings()).chatEnabled) {
      return reply.code(503).send({ error: "CHAT_DISABLED", message: "The portfolio assistant is temporarily unavailable." });
    }
    const limit = await rateLimit(`chat:${clientIp(req)}`, CHAT_MAX, CHAT_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      return reply.code(429).send({ error: "RATE_LIMITED", message: "The intelligence core needs a moment. Try again shortly." });
    }

    const { message } = parseBody(req, chatSchema);
    const reply_ = await answerQuestion(message);

    void trackAnalyticsEvent("chat_query", reply_.confidence).catch(() => undefined);

    return reply_;
  });

  app.get("/suggestions", async (req, reply) => {
    const limit = await rateLimit(`chat-sug:${clientIp(req)}`, 30, 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      return reply.code(429).send({ error: "RATE_LIMITED", message: "Too many requests. Try again shortly." });
    }
    if (!(await getSiteSettings()).chatEnabled) return reply.code(503).send({ error: "CHAT_DISABLED", message: "The portfolio assistant is temporarily unavailable." });
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

import type { FastifyInstance } from "fastify";

import { config } from "../../config.js";
import { HttpError } from "../../utils/http.js";

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  pushed_at: string;
  fork: boolean;
}

interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
}

interface CacheEntry {
  body: unknown;
  at: number;
  stale: boolean;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: CacheEntry | null = null;

/**
 * Live GitHub overview with a 10-minute cache and graceful stale fallback —
 * the portfolio must never break because the GitHub API is unavailable.
 */
export async function githubRoutes(app: FastifyInstance): Promise<void> {
  app.get("/overview", async (_req, reply) => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return cache.body;
    }

    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "user-agent": "hp-os-portfolio",
      ...(config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {}),
    };

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch("https://api.github.com/users/harshpandeyz", { headers, signal: AbortSignal.timeout(6000) }),
        fetch("https://api.github.com/users/harshpandeyz/repos?sort=pushed&per_page=100", { headers, signal: AbortSignal.timeout(6000) }),
      ]);

      if (!userRes.ok || !reposRes.ok) throw new HttpError(502, "UPSTREAM", "GitHub API unavailable");

      const user = (await userRes.json()) as GithubUser;
      const repos = (await reposRes.json()) as GithubRepo[];

      const body = {
        login: user.login,
        name: user.name,
        bio: user.bio,
        publicRepos: user.public_repos,
        followers: user.followers,
        htmlUrl: user.html_url,
        topRepositories: repos
          .filter((r) => !r.fork && !["portfolio", "harshpandeyz"].includes(r.name))
          .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
          .slice(0, 6)
          .map((r) => ({
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            url: r.html_url,
            pushedAt: r.pushed_at,
          })),
        fetchedAt: new Date().toISOString(),
        stale: false,
      };

      cache = { body, at: Date.now(), stale: false };
      return body;
    } catch {
      if (cache) {
        return { ...(cache.body as object), stale: true };
      }
      reply.code(503);
      return { error: "UPSTREAM_UNAVAILABLE", message: "GitHub data temporarily unavailable", stale: true };
    }
  });
}

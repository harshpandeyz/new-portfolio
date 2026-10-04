import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SITE_URL = "http://localhost:5173";

function staticSeo(siteUrl: string) {
  return {
    name: "portfolio-static-seo",
    transformIndexHtml(html: string) {
      return html.replaceAll("__SITE_URL__", siteUrl);
    },
    async closeBundle() {
      const outputDir = path.resolve(configDir, "dist");
      const template = await readFile(path.join(outputDir, "index.html"), "utf8");
      const { pages } = JSON.parse(await readFile(path.join(configDir, "seo-routes.json"), "utf8")) as {
        pages: { path: string; title: string; description: string }[];
      };

      for (const page of pages) {
        if (page.path === "/") continue;
        const pageUrl = `${siteUrl}${page.path}`;
        let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
        html = setMeta(html, "name", "description", page.description);
        html = setMeta(html, "property", "og:title", page.title);
        html = setMeta(html, "property", "og:description", page.description);
        html = setMeta(html, "property", "og:url", pageUrl);
        html = setMeta(html, "property", "og:type", page.path.startsWith("/projects/") ? "article" : "website");
        html = setMeta(html, "name", "twitter:title", page.title);
        html = setMeta(html, "name", "twitter:description", page.description);
        html = setLink(html, "canonical", pageUrl);

        const segments = page.path.split("/").filter(Boolean);
        const targetDir = path.join(outputDir, ...segments);
        await mkdir(targetDir, { recursive: true });
        await writeFile(path.join(targetDir, "index.html"), html);
      }

      const locations = pages.map(({ path: route }) => `  <url><loc>${escapeXml(siteUrl + route)}</loc></url>`).join("\n");
      await writeFile(path.join(outputDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`);
      await writeFile(path.join(outputDir, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /private\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
    },
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeXml(value: string): string {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function setMeta(html: string, key: "name" | "property", name: string, content: string): string {
  const selector = new RegExp(`<meta\\b(?=[^>]*\\b${key}="${name}")[^>]*>`);
  const tag = `<meta ${key}="${name}" content="${escapeHtml(content)}" />`;
  if (!selector.test(html)) return html.replace("</head>", `    ${tag}\n  </head>`);
  return html.replace(selector, tag);
}

function setLink(html: string, rel: string, href: string): string {
  const selector = new RegExp(`<link\\b(?=[^>]*\\brel="${rel}")[^>]*>`);
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  if (!selector.test(html)) return html.replace("</head>", `    ${tag}\n  </head>`);
  return html.replace(selector, tag);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, "VITE_");
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  const apiPort = env.VITE_API_PORT || "4000";

  return {
    plugins: [react(), staticSeo(siteUrl)],
    resolve: {
      // Keep browser development and static builds on the source package while
      // the API's compiled Node output consumes packages/shared/dist.
      alias: {
        "@hp/shared": path.resolve(configDir, "../../packages/shared/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      // A port change silently breaks the API proxy and can make local QA
      // exercise a different process than the one developers intended.
      strictPort: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
        "/static": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      },
    },
    build: {
      target: "es2022",
      manifest: true,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            router: ["react-router-dom"],
          },
        },
      },
    },
  };
});

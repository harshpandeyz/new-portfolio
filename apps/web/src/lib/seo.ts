import { SEO } from "../app/constants";

interface MetaInput {
  title: string;
  description?: string;
  url?: string;
  image?: string;
}

const DEFAULT_IMAGE = `${SEO.siteUrl}/files/harsh-photo.jpeg`;

function setMeta(selector: string, attribute: string, value: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    // Create missing tags so SPA navigations never silently keep stale values.
    if (selector.startsWith('meta[')) {
      const m = document.createElement("meta");
      const nameMatch = selector.match(/name="([^"]+)"/);
      const propMatch = selector.match(/property="([^"]+)"/);
      if (nameMatch) m.setAttribute("name", nameMatch[1]!);
      if (propMatch) m.setAttribute("property", propMatch[1]!);
      document.head.appendChild(m);
      el = m;
    } else if (selector.startsWith("link[")) {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      document.head.appendChild(l);
      el = l;
    }
  }
  el?.setAttribute(attribute, value);
}

function ensureTag(selector: string, create: () => HTMLElement) {
  if (!document.head.querySelector(selector)) document.head.appendChild(create());
}

/** Lightweight document-metadata controller for page-specific SEO. */
export function applyMeta(input: MetaInput) {
  const url = input.url ?? SEO.siteUrl;
  document.title = input.title;
  const description = input.description ?? SEO.description;
  const image = input.image?.startsWith("/") ? new URL(input.image, SEO.siteUrl).toString() : input.image ?? DEFAULT_IMAGE;

  // Ensure baseline tags exist once (OG type, site name, twitter card, theme).
  ensureTag('meta[property="og:type"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:type");
    m.setAttribute("content", "website");
    return m;
  });
  ensureTag('meta[property="og:site_name"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:site_name");
    m.setAttribute("content", "Harsh Pandey — Portfolio");
    return m;
  });
  ensureTag('meta[name="twitter:card"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "twitter:card");
    m.setAttribute("content", "summary_large_image");
    return m;
  });
  ensureTag('meta[name="theme-color"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "theme-color");
    m.setAttribute("content", "#0a0a0f");
    return m;
  });

  setMeta('meta[name="description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", url);
  setMeta('meta[property="og:title"]', "content", input.title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", image);
  setMeta('meta[name="twitter:title"]', "content", input.title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", image);
}

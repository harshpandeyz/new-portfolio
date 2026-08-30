import { SEO } from "../app/constants";

interface MetaInput {
  title: string;
  description?: string;
  url?: string;
  image?: string;
}

const DEFAULT_IMAGE = `${SEO.siteUrl}/files/harsh-photo.jpeg`;

function setMeta(selector: string, attribute: string, value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attribute, value);
}

/** Lightweight document-metadata controller for page-specific SEO. */
export function applyMeta(input: MetaInput) {
  const url = input.url ?? SEO.siteUrl;
  document.title = input.title;
  const description = input.description ?? SEO.description;

  setMeta('meta[name="description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", url);
  setMeta('meta[property="og:title"]', "content", input.title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", input.image ?? DEFAULT_IMAGE);
  setMeta('meta[name="twitter:title"]', "content", input.title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", input.image ?? DEFAULT_IMAGE);
}
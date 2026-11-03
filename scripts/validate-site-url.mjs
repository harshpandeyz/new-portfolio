const raw = process.argv[2]?.trim();

function fail(message) {
  console.error(`[site-url] ${message}`);
  process.exit(1);
}

if (!raw) fail("VITE_SITE_URL is required for a production web build.");
let url;
try {
  url = new URL(raw);
} catch {
  fail("VITE_SITE_URL must be a valid HTTPS origin.");
}

const hostname = url.hostname.toLowerCase();
const isExample = hostname === "example.com" || hostname === "example.org" || hostname === "example.net" ||
  hostname.endsWith(".example") || hostname.endsWith(".example.com") || hostname.endsWith(".example.org") || hostname.endsWith(".example.net");
const isLocal = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".test");
const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");

if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  raw !== url.origin ||
  isExample ||
  isLocal ||
  isIpAddress ||
  /your[-_]?domain|change[-_]?me|replace[-_]?this/i.test(raw)
) {
  fail("VITE_SITE_URL must be the exact public HTTPS origin (for example https://portfolio.example.org). No path, query, credentials, localhost, example domain, or placeholder is allowed.");
}

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest, type RequestOptions } from "node:https";

type Address = { address: string; family: number };
type ProviderJsonResponse = { status: number; json: () => unknown };

const ADDRESS_CACHE_MS = 60_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const addressCache = new Map<string, { address: Address; expiresAt: number }>();

function ipv4IsPublic(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function ipv6Value(address: string): bigint | null {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  const dotted = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const withoutDotted = dotted
    ? normalized.replace(dotted, dotted.split(".").map(Number).reduce((value, octet) => (value << 8n) | BigInt(octet), 0n).toString(16).padStart(8, "0").match(/.{4}/g)!.join(":"))
    : normalized;
  const halves = withoutDotted.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0]!.split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1]!.split(":") : [];
  const zeros = 8 - left.length - right.length;
  if (zeros < 0 || (halves.length === 1 && zeros !== 0)) return null;
  const words = [...left, ...Array(zeros).fill("0"), ...right];
  if (words.length !== 8 || words.some((word) => !/^[\da-f]{1,4}$/.test(word))) return null;
  return words.reduce((value, word) => (value << 16n) | BigInt(`0x${word}`), 0n);
}

function addressIsPublic(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return ipv4IsPublic(address);
  if (family !== 6) return false;
  const value = ipv6Value(address);
  if (value === null) return false;
  // IPv4-mapped IPv6 follows the IPv4 policy above.
  if (value >> 32n === 0xffffn) {
    const ipv4 = Number(value & 0xffffffffn);
    return ipv4IsPublic(`${ipv4 >>> 24}.${(ipv4 >>> 16) & 255}.${(ipv4 >>> 8) & 255}.${ipv4 & 255}`);
  }
  // Only global unicast (2000::/3) is accepted. Exclude documentation and
  // transition ranges that are reserved for special use.
  if (value >> 125n !== 1n) return false;
  const prefix = Number(value >> 112n);
  // 6to4 embeds an IPv4 destination and can tunnel requests into private IPv4
  // ranges even when the outer IPv6 address is globally routable.
  if (prefix === 0x2002) return false;
  if (prefix === 0x2001) {
    const secondWord = Number((value >> 96n) & 0xffffn);
    if (secondWord <= 0x01ff || secondWord === 0x0db8) return false;
  }
  return true;
}

/** Normalize and reject unsafe provider targets before storing configuration. */
export function normalizeProviderBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Use a valid public HTTPS provider URL.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const bareHost = host.replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    !bareHost ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443") ||
    bareHost === "localhost" ||
    bareHost.endsWith(".localhost") ||
    bareHost.endsWith(".local") ||
    bareHost.endsWith(".internal") ||
    bareHost.endsWith(".test") ||
    bareHost.endsWith(".invalid") ||
    !bareHost.includes(".")
  ) {
    throw new Error("Use a public HTTPS provider URL without credentials, query, or fragment.");
  }
  if (isIP(bareHost) && !addressIsPublic(bareHost)) throw new Error("Private or reserved provider addresses are not allowed.");
  url.hostname = bareHost;
  url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString().replace(/\/$/, "");
}

async function resolvePublicAddress(host: string): Promise<Address> {
  const family = isIP(host);
  if (family) {
    if (!addressIsPublic(host)) throw new Error("Private or reserved provider addresses are not allowed.");
    return { address: host, family };
  }
  const cached = addressCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.address;
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => !addressIsPublic(entry.address))) {
    throw new Error("Provider hostname resolves to a private or reserved address.");
  }
  const address = addresses.find((entry) => entry.family === 4) ?? addresses[0]!;
  addressCache.set(host, { address, expiresAt: Date.now() + ADDRESS_CACHE_MS });
  return address;
}

async function resolvePublicAddressWithTimeout(host: string, timeoutMs: number): Promise<Address> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolvePublicAddress(host),
      new Promise<Address>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Provider DNS resolution timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * HTTPS JSON request with a pinned, validated public DNS result. Node's
 * https.request does not follow redirects, so a provider cannot redirect the
 * server to an internal address after validation.
 */
export async function requestProviderJson(
  baseUrl: string,
  endpoint: string,
  options: { apiKey: string; method?: "GET" | "POST"; body?: unknown; timeoutMs: number },
): Promise<ProviderJsonResponse> {
  const normalized = normalizeProviderBaseUrl(baseUrl);
  const target = new URL(`${normalized}/${endpoint.replace(/^\/+/, "")}`);
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const timeoutMs = Math.min(Math.max(options.timeoutMs, 2_000), 60_000);
  const deadline = Date.now() + timeoutMs;
  const address = await resolvePublicAddressWithTimeout(hostname, Math.max(1, deadline - Date.now()));
  if (Date.now() >= deadline) throw new Error("Provider request timed out.");
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, response?: ProviderJsonResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadlineTimer);
      if (error) reject(error);
      else if (response) resolve(response);
      else reject(new Error("Provider request failed without a response."));
    };
    const lookupPinned = ((_: string, lookupOptions: { all?: boolean }, callback: (...args: unknown[]) => void) => {
      if (lookupOptions.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    }) as NonNullable<RequestOptions["lookup"]>;
    const req = httpsRequest(target, {
      method: options.method ?? "GET",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
      },
      lookup: lookupPinned,
      servername: isIP(hostname) ? undefined : hostname,
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error("Provider response exceeded the size limit."));
          return;
        }
        chunks.push(bytes);
      });
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        finish(undefined, {
          status: res.statusCode ?? 0,
          json: () => JSON.parse(raw) as unknown,
        });
      });
      res.on("aborted", () => finish(new Error("Provider response ended before completion.")));
      res.on("error", (error) => finish(error));
    });
    const deadlineTimer = setTimeout(() => req.destroy(new Error("Provider request timed out.")), Math.max(1, deadline - Date.now()));
    req.on("error", (error) => finish(error));
    req.on("close", () => clearTimeout(deadlineTimer));
    if (body) req.write(body);
    req.end();
  });
}

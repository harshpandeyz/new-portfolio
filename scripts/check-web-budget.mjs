import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/web/dist");
const manifest = JSON.parse(readFileSync(path.join(root, ".vite/manifest.json"), "utf8"));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error("Vite manifest has no entry point");

const gzipBytes = (file) => gzipSync(readFileSync(path.join(root, file))).byteLength;
const initial = new Set();
const visitStatic = (key) => {
  if (initial.has(key)) return;
  initial.add(key);
  for (const imported of manifest[key]?.imports ?? []) visitStatic(imported);
};
visitStatic(entryKey);

const initialJs = [...initial]
  .map((key) => manifest[key]?.file)
  .filter((file) => file?.endsWith(".js"))
  .reduce((sum, file) => sum + gzipBytes(file), 0);
const initialCssFiles = new Set([...initial].flatMap((key) => manifest[key]?.css ?? []));
const initialCss = [...initialCssFiles].reduce((sum, file) => sum + gzipBytes(file), 0);
const dynamicEntries = Object.values(manifest).filter((item) => item.isDynamicEntry && item.file?.endsWith(".js"));
const largestDynamicJs = Math.max(0, ...dynamicEntries.map((item) => gzipBytes(item.file)));
const dynamicCssFiles = new Set(dynamicEntries.flatMap((item) => item.css ?? []));
const largestDynamicCss = Math.max(0, ...[...dynamicCssFiles].map(gzipBytes));

const budgets = [
  ["initial JavaScript", initialJs, 135 * 1024],
  ["initial CSS", initialCss, 25 * 1024],
  ["largest lazy JavaScript entry", largestDynamicJs, 24 * 1024],
  ["largest lazy CSS asset", largestDynamicCss, 16 * 1024],
];
let failed = false;
for (const [name, actual, limit] of budgets) {
  const status = actual <= limit ? "OK" : "OVER";
  console.log(`${status.padEnd(4)} ${name}: ${(actual / 1024).toFixed(1)} KiB / ${(limit / 1024).toFixed(0)} KiB gzip`);
  if (actual > limit) failed = true;
}
if (failed) process.exitCode = 1;

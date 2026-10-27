/**
 * One-time writer for the compatibility golden files. It refuses to
 * overwrite an existing golden: a template change must be investigated,
 * not re-baselined. Run (only for new cases):
 *   node --experimental-strip-types --import ./scripts/_register.mjs packages/core/test/compat/write_golden.ts
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { GOLDEN_CASES } from "./golden_cases.js";

const dir = new URL("./golden/", import.meta.url);
mkdirSync(dir, { recursive: true });
const manifest: Record<string, string> = {};
for (const c of GOLDEN_CASES) {
  const svg = c.render();
  const file = new URL(`${c.name}.svg`, dir);
  manifest[c.name] = createHash("sha256").update(svg, "utf8").digest("hex");
  if (existsSync(file)) { console.log(`keep  ${c.name}`); continue; }
  writeFileSync(file, svg, "utf8");
  console.log(`write ${c.name}`);
}
const manifestFile = new URL("manifest.json", dir);
if (!existsSync(manifestFile)) writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentSurface } from "./api_surface.js";
import type { ApiSurface } from "./api_surface.js";

const lock: ApiSurface = JSON.parse(readFileSync(new URL("./api-lock.json", import.meta.url), "utf8"));
const now = await currentSurface();

test("api lock: every recorded core export still exists with the same kind and arity", () => {
  const changed = Object.entries(lock.coreExports).filter(([k, v]) => now.coreExports[k] !== v).map(([k, v]) => `${k}: ${v} -> ${now.coreExports[k] ?? "missing"}`);
  assert.deepEqual(changed, []);
});
test("api lock: CLI help keeps every recorded line and `diagram --help` is unchanged", () => {
  for (const line of lock.cliUsageLines) assert.ok(now.cliUsageLines.includes(line), `CLI usage line missing: ${line}`);
  assert.equal(now.cliDiagramHelp, lock.cliDiagramHelp);
});
test("api lock: every recorded npm script is unchanged", () => {
  for (const [k, v] of Object.entries(lock.npmScripts)) assert.equal(now.npmScripts[k], v, `npm script ${k}`);
});
test("api lock: every recorded plugin file is byte-identical", () => {
  for (const [k, v] of Object.entries(lock.pluginFiles)) assert.equal(now.pluginFiles[k], v, `plugin file ${k}`);
});

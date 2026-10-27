import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GOLDEN_CASES } from "./golden_cases.js";
import { runCli } from "./api_surface.js";

const dir = new URL("./golden/", import.meta.url);
const manifest: Record<string, string> = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));

for (const c of GOLDEN_CASES) {
  test(`compat golden: ${c.name} renders byte-identically`, () => {
    const file = new URL(`${c.name}.svg`, dir);
    assert.ok(existsSync(file), `missing golden ${c.name}.svg`);
    const golden = readFileSync(file, "utf8");
    const svg = c.render();
    assert.equal(createHash("sha256").update(golden, "utf8").digest("hex"), manifest[c.name], "golden file differs from its recorded hash");
    assert.equal(svg, golden);
  });
}

test("compat golden: every golden file has a case and every gallery example is covered", () => {
  const files = readdirSync(dir).filter(f => f.endsWith(".svg")).map(f => f.slice(0, -4)).sort();
  assert.deepEqual(files, GOLDEN_CASES.map(c => c.name).sort());
  assert.deepEqual(Object.keys(manifest).sort(), files);
  const gallery = readFileSync(new URL("../../../../examples/render-diagrams.mjs", import.meta.url), "utf8");
  const names = [...gallery.matchAll(/\['([a-z-]+)', (?:\{|render)/g)].map(m => m[1]!);
  assert.ok(names.length >= 16, `expected the 16 gallery examples, found ${names.length}`);
  for (const n of names) assert.ok(files.includes(`gallery-${n}`), `gallery example ${n} has no golden`);
});

test("compat golden: CLI `diagram` default output equals the golden", () => {
  const out = join(mkdtempSync(join(tmpdir(), "kinetra-compat-")), "rods.svg");
  const r = runCli(["diagram", "", out]);
  // An empty input argument selects the default model, exactly like no argument.
  assert.equal(r.status, 0);
  assert.equal(readFileSync(out, "utf8"), readFileSync(new URL("cli-default-charged-rods.svg", dir), "utf8"));
});

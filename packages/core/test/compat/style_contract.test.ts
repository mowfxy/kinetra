import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkToolkitStyle } from "../../src/toolkit/style.js";

// The contract is extracted from the Scene2D template family; those goldens
// must satisfy it, which proves the contract describes real Kinetra output.
const SCENE2D_GOLDENS = ["gallery-incline-freebody", "gallery-projectile", "gallery-atwood", "gallery-movable-pulley",
  "gallery-plane-mirror", "gallery-concave-mirror", "gallery-convex-mirror", "gallery-converging-lens", "gallery-diverging-lens",
  "gallery-lens-at-focus", "gallery-virtual-lens-image", "audit-projectile", "audit-vector-marker", "audit-converging-lens"];

for (const name of SCENE2D_GOLDENS) {
  test(`style contract: template golden ${name} conforms`, () => {
    const svg = readFileSync(new URL(`./golden/${name}.svg`, import.meta.url), "utf8");
    assert.deepEqual(checkToolkitStyle(svg), []);
  });
}

test("style contract: checker rejects off-contract SVG", () => {
  const svg = readFileSync(new URL("./golden/gallery-incline-freebody.svg", import.meta.url), "utf8");
  const rules = (s: string) => new Set(checkToolkitStyle(s).map(v => v.rule));
  assert.ok(rules(svg.replace('stroke="#1f4f8b"', 'stroke="#ff00ff"')).has("palette"));
  assert.ok(rules(svg.replace('font-family="Arial, Helvetica, sans-serif"', 'font-family="Comic Sans"')).has("font"));
  assert.ok(rules(svg.replace('stroke-width="1.6"', 'stroke-width="4.2"')).has("stroke-width"));
  assert.ok(rules(svg.replace('refX="6"', 'refX="5"')).has("marker"));
  assert.ok(rules(svg.replace('<?xml version="1.0" encoding="UTF-8"?>', "")).has("root"));
  assert.ok(rules(svg.replace("</svg>", "<circle cx=\"NaN\"/></svg>")).has("finite"));
});

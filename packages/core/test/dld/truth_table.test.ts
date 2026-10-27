import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expressionToMask,
  maskToMintermExpression,
  maskToMaxtermExpression,
  mintermExpr,
  maxtermExpr,
} from "../../src/dld/truth_table.js";
import { expressionToCircuit } from "../../src/dld/circuit.js";
import { renderLogicSchematic } from "../../src/diagram/logic_schematic.js";
import { context } from "../../src/dld/boolean.js";

// Regression: mintermExpr/maxtermExpr used the `variable`/`not` builders
// without importing them, so any non-empty mask threw
// "ReferenceError: variable is not defined" (crashed demo:workflow-a).

test("maskToMintermExpression: XOR mask round-trips and builds a schematic", () => {
  const ctx = context(["a", "b"]);
  const xorMask = (1n << 1n) | (1n << 2n);
  const expr = maskToMintermExpression(xorMask, ctx);
  assert.equal(expressionToMask(expr, ctx), xorMask);

  const circuit = expressionToCircuit("xor2", expr);
  const svg = renderLogicSchematic({ circuit, width: 600, height: 360, title: "a XOR b" });
  assert.ok(svg.includes("<svg"));
});

test("mintermExpr/maxtermExpr: every index selects exactly its assignment", () => {
  const ctx = context(["a", "b", "c"]);
  for (let i = 0; i < ctx.totalAssignments; i++) {
    const bit = 1n << BigInt(i);
    assert.equal(expressionToMask(mintermExpr(i, ctx), ctx), bit);
    assert.equal(expressionToMask(maxtermExpr(i, ctx), ctx), ~bit & ((1n << 8n) - 1n));
  }
});

test("maskToMaxtermExpression: round-trips an arbitrary mask", () => {
  const ctx = context(["a", "b", "c", "d"]);
  const mask = [0, 2, 5, 7, 8, 10, 13, 15].reduce((m, i) => m | (1n << BigInt(i)), 0n);
  assert.equal(expressionToMask(maskToMintermExpression(mask, ctx), ctx), mask);
  assert.equal(expressionToMask(maskToMaxtermExpression(mask, ctx), ctx), mask);
});

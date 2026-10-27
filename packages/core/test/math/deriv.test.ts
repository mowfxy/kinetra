import { test } from "node:test";
import assert from "node:assert/strict";
import { collectVars, parseExpr } from "../../src/math/expression.js";
import type { Expr } from "../../src/math/expression.js";
import { evaluate, sample1d } from "../../src/math/eval.js";

const close = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const at = (src: string, vars: Record<string, number>) => evaluate(parseExpr(src), { vars });

test("deriv: d/dx parses with x as the variable", () => {
  const e = parseExpr("d/dx(x^2)");
  assert.equal(e.type, "deriv");
  assert.equal(e.type === "deriv" && e.var, "x");
  assert.deepEqual(collectVars(e), ["x"]);
  const t = parseExpr("d/dtheta(sin(theta))");
  assert.equal(t.type === "deriv" && t.var, "theta");
});

test("deriv: d/dx expressions evaluate to the exact derivative", () => {
  close(at("d/dx(x^2)", { x: 3 }), 6);
  close(at("d/dx(x^3 + 2*x)", { x: 2 }), 14);
  // Constant written first: the parser reads a number right before ")" as an implicit product.
  close(at("d/dx(7 + 3*x^2 - 5*x)", { x: 1 }), 1);
  close(at("d/dt(sin(t))", { t: 0.4 }), Math.cos(0.4));
  close(at("d/dx(exp(2*x))", { x: 2 }), 2 * Math.exp(4));
  close(at("d/dx(ln(x))", { x: 2 }), 0.5);
  close(at("d/dx(x/(1 + x))", { x: 2 }), 1 / 9);
});

test("deriv: other variables are held constant", () => {
  close(at("d/dx(y*x^2)", { x: 2, y: 3 }), 12);
  close(at("d/dy(y*x^2)", { x: 2, y: 3 }), 4);
  close(at("d/dx(y)", { x: 2, y: 3 }), 0);
});

test("deriv: derivatives nest and compose with arithmetic", () => {
  close(at("d/dx(d/dx(x^3))", { x: 2 }), 12);
  close(at("1 + d/dx(x^2)", { x: 5 }), 11);
  const order2: Expr = { type: "deriv", var: "x", body: parseExpr("x^4"), order: 2 };
  close(evaluate(order2, { vars: { x: 2 } }), 48);
});

// derivative() expands f^g with ln(f), so powers of x are only finite for x > 0.
test("deriv: d/dx agrees with a central difference across a domain", () => {
  const f = parseExpr("sin(x)*x^2");
  const h = 1e-5;
  for (const { x, y } of sample1d(parseExpr("d/dx(sin(x)*x^2)"), "x", 0.25, 3, 12)) {
    const fd = (evaluate(f, { vars: { x: x + h } }) - evaluate(f, { vars: { x: x - h } })) / (2 * h);
    close(y, fd, 1e-6);
  }
});

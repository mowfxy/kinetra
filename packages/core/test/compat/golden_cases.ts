/**
 * Compatibility lock: every existing template rendering that Kinetra
 * documents or ships as an example. The SVG for each case is stored under
 * ./golden/ and must stay byte-identical. These definitions mirror
 * examples/render-diagrams.mjs, the CLI default, docs/diagrams.md,
 * scripts/audit-diagrams.mjs, the CLI workflows and the overlap fixtures.
 *
 * Never regenerate the golden files to make a failing comparison pass.
 */
import { readFileSync } from "node:fs";
import { defaultElectrostaticRods, renderElectrostaticRods } from "../../src/diagram/electrostatics.js";
import { renderOptics } from "../../src/diagram/optics.js";
import { renderProjectile } from "../../src/diagram/projectile.js";
import { renderFBD } from "../../src/diagram/freebody.js";
import { atwoodDynamics, renderPulley } from "../../src/diagram/pulley.js";
import { renderScalarField, renderVectorField } from "../../src/diagram/fields.js";
import { renderSchematic } from "../../src/diagram/circuit_schematic.js";
import { renderLogicSchematic } from "../../src/diagram/logic_schematic.js";
import { renderTimingDiagram } from "../../src/diagram/timing_render.js";
import { renderScene2D } from "../../src/diagram/scene2d.js";
import type { Circuit } from "../../src/dld/circuit.js";
// @ts-ignore -- plain JS fixture shared with the overlap tests
import { EXTRA_SCENARIOS } from "../diagram/fixtures/overlap-scenarios.mjs";

export interface GoldenCase { name: string; render: () => string }

const REPO = new URL("../../../../", import.meta.url);
const chargedRods = () => JSON.parse(readFileSync(new URL("examples/charged-rods.json", REPO), "utf8"));

const optics = { width: 800, height: 460, world: { xMin: -6, xMax: 6, yMin: -3.5, yMax: 3.5 }, objectBase: { x: -3, y: 0 }, objectHeight: 1 };
const mass = 5, g = 9.81, incline = Math.PI / 6;
const auditBase = { world: { xMin: -5, xMax: 5, yMin: -3, yMax: 3 }, width: 600, height: 360 };
const auditOptic = { ...auditBase, element: { kind: "thin-lens-converging", x: 0, y: 0, focal: 1 }, objectBase: { x: -2, y: 0 }, objectHeight: 1 } as const;
const auditProjectile = { width: 600, height: 360, initialPosition: { x: 0, y: 20 }, initialSpeed: 15, launchAngleDeg: 30, gravity: 9.81 };
const andCircuit: Circuit = { id: "test", name: "AND", inputs: [{ id: "a", label: "A" }, { id: "b", label: "B" }], outputs: [], nets: [], metadata: {}, gates: [
  { id: "a", kind: "INPUT", inputs: [], output: "na" }, { id: "b", kind: "INPUT", inputs: [], output: "nb" }, { id: "g", kind: "AND", inputs: ["na", "nb"], output: "ng" },
] } as Circuit;

const RENDERERS: Record<string, (m: any) => string> = { renderVectorField, renderScalarField, renderPulley, renderLogicSchematic, renderSchematic };

export const GOLDEN_CASES: GoldenCase[] = [
  // CLI default: `npm run diagram`
  { name: "cli-default-charged-rods", render: () => renderElectrostaticRods(defaultElectrostaticRods()) },
  // docs/diagrams.md example
  { name: "docs-charged-rods-like-charges", render: () => { const m = defaultElectrostaticRods(); m.nearby.charge = -1; m.nearby.material = "rubber"; m.nearby.label = "Rubber"; return renderElectrostaticRods(m); } },
  // examples/render-diagrams.mjs gallery (16 diagrams)
  { name: "gallery-charged-rods", render: () => renderElectrostaticRods(chargedRods()) },
  { name: "gallery-charged-rods-repulsion", render: () => { const m = chargedRods(); return renderElectrostaticRods({ ...m, nearby: { ...m.nearby, charge: -1, material: "rubber", label: "Rubber" } }); } },
  ...([
    ["plane-mirror", { kind: "plane-mirror", x: 0, yMin: -2, yMax: 2 }],
    ["concave-mirror", { kind: "concave-mirror", x: 0, y: 0, focal: 1, radius: 2 }],
    ["convex-mirror", { kind: "convex-mirror", x: 0, y: 0, focal: -1, radius: 2 }],
    ["converging-lens", { kind: "thin-lens-converging", x: 0, y: 0, focal: 1 }],
    ["diverging-lens", { kind: "thin-lens-diverging", x: 0, y: 0, focal: -1 }],
  ] as const).map(([name, element]) => ({ name: "gallery-" + name, render: () => renderOptics({ ...optics, element, title: name.replaceAll("-", " ") } as any) })),
  { name: "gallery-lens-at-focus", render: () => renderOptics({ ...optics, objectBase: { x: -1, y: 0 }, element: { kind: "thin-lens-converging", x: 0, y: 0, focal: 1 }, title: "Object at focus" } as any) },
  { name: "gallery-virtual-lens-image", render: () => renderOptics({ ...optics, objectBase: { x: -0.6, y: 0 }, element: { kind: "thin-lens-converging", x: 0, y: 0, focal: 1 }, title: "Virtual image" } as any) },
  { name: "gallery-projectile", render: () => renderProjectile({ width: 800, height: 460, initialPosition: { x: 0, y: 20 }, initialSpeed: 15, launchAngleDeg: 30, gravity: 9.81 } as any) },
  { name: "gallery-incline-freebody", render: () => renderFBD({ width: 800, height: 520, world: { xMin: -6, xMax: 6, yMin: -4, yMax: 4 }, bodyPosition: { x: 0, y: 0 }, bodySize: { w: 1.6, h: 0.9 }, bodyAngleDeg: 30, bodyLabel: "5 kg", frameAngleDeg: 30, showComponents: true, forces: [
    { point: { x: 0, y: 0 }, components: { x: 0, y: -mass * g }, magnitude: mass * g, unit: "N", label: "W" },
    { point: { x: 0, y: 0 }, components: { x: -mass * g * Math.cos(incline) * Math.sin(incline), y: mass * g * Math.cos(incline) ** 2 }, magnitude: mass * g * Math.cos(incline), unit: "N", label: "N", color: "#377f5c" },
    { point: { x: 0, y: 0 }, components: { x: mass * g * Math.sin(incline) * Math.cos(incline), y: mass * g * Math.sin(incline) ** 2 }, magnitude: mass * g * Math.sin(incline), unit: "N", label: "static friction", color: "#357aa6" },
  ] }) },
  { name: "gallery-atwood", render: () => renderPulley({ width: 600, height: 520, world: { xMin: -3, xMax: 3, yMin: -2, yMax: 5 }, pulleys: [{ center: { x: 0, y: 3 }, radius: 0.8, fixed: true }], masses: [{ mass: 2, position: { x: -0.8, y: 0.2 }, size: { w: 0.65, h: 0.8 }, label: "2 kg" }, { mass: 3, position: { x: 0.8, y: -0.6 }, size: { w: 0.65, h: 0.8 }, label: "3 kg" }], tension: atwoodDynamics(2, 3).tension } as any) },
  { name: "gallery-movable-pulley", render: () => renderPulley({ width: 600, height: 520, world: { xMin: -3, xMax: 3, yMin: -2, yMax: 5 }, configuration: "movable", pulleys: [{ center: { x: 0, y: 1.5 }, radius: 0.8, fixed: false }], masses: [{ mass: 2, position: { x: 0, y: -0.6 }, size: { w: 0.65, h: 0.8 }, label: "2 kg" }], tension: 9.81 } as any) },
  { name: "gallery-contours", render: () => renderScalarField({ type: "scalar", width: 600, height: 500, world: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }, cols: 40, rows: 40, field: p => p.x * p.x + p.y * p.y, contours: [1, 4, 6.25], title: "Scalar potential and level curves" } as any) },
  { name: "gallery-radial-field", render: () => renderVectorField({ type: "vector", width: 600, height: 500, world: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }, cols: 12, rows: 12, field: p => ({ x: p.x, y: p.y }), title: "Outward radial field" } as any) },
  { name: "gallery-rc-circuit", render: () => renderSchematic({ width: 800, height: 460, world: { xMin: -2, xMax: 6, yMin: -3, yMax: 2 }, title: "RC low-pass circuit", components: [
    { id: "V", kind: "voltage-source", position: { x: 0, y: 0 }, rotationDeg: 90, label: "Vᵢₙ" },
    { id: "R", kind: "resistor", position: { x: 2, y: 1 }, label: "R" },
    { id: "C", kind: "capacitor", position: { x: 4, y: 0 }, rotationDeg: 90, label: "C" },
    { id: "G", kind: "ground", position: { x: 2, y: -1.5 } },
  ], wires: [
    { from: { componentId: "V", pin: 1 }, to: { componentId: "R", pin: 0 }, via: [{ x: 0, y: 1 }] },
    { from: { componentId: "R", pin: 1 }, to: { componentId: "C", pin: 1 }, via: [{ x: 4, y: 1 }] },
    { from: { componentId: "C", pin: 0 }, to: { componentId: "G", pin: 0 }, via: [{ x: 4, y: -1.5 }] },
    { from: { componentId: "V", pin: 0 }, to: { componentId: "G", pin: 0 }, via: [{ x: 0, y: -1.5 }] },
  ] } as any) },
  // scripts/audit-diagrams.mjs evidence examples
  { name: "audit-projectile", render: () => renderProjectile(auditProjectile as any) },
  { name: "audit-plane-mirror", render: () => renderOptics({ ...auditOptic, element: { kind: "plane-mirror", x: 0, yMin: -2, yMax: 2 } } as any) },
  { name: "audit-converging-lens", render: () => renderOptics(auditOptic as any) },
  { name: "audit-lens-at-focus", render: () => renderOptics({ ...auditOptic, objectBase: { x: -1, y: 0 } } as any) },
  { name: "audit-vector-marker", render: () => renderScene2D({ ...auditBase, shapes: [{ kind: "vector", at: { x: 0, y: 0 }, v: { x: 1, y: 1 }, label: "F" }] }) },
  { name: "audit-circuit-scale", render: () => renderSchematic({ ...auditBase, components: [{ id: "R", kind: "resistor", position: { x: 0, y: 0 }, label: "R" }], wires: [{ from: { componentId: "R", pin: 0 }, to: { point: { x: -2, y: 0 } } }] } as any) },
  { name: "audit-scalar-contours", render: () => renderScalarField({ ...auditBase, type: "scalar", field: p => p.x + p.y, cols: 4, rows: 4, contours: [0.123] } as any) },
  // Logic and timing renderers as exercised by the textbook accuracy tests.
  // (CLI workflow-a cannot be captured: it already throws in
  // dld/truth_table.ts on main, a pre-existing bug left untouched.)
  { name: "logic-and-gate", render: () => renderLogicSchematic({ circuit: andCircuit, width: 600, height: 400 }) },
  { name: "timing-clock", render: () => renderTimingDiagram({ name: "Clock", signals: ["CLK"], duration: 10, transitions: [{ time: 1, signal: "CLK", to: 1 }, { time: 6, signal: "CLK", to: 0 }], annotations: [{ time: 6, text: "fall" }] } as any, { width: 600, height: 240, tMin: 2, tMax: 8 }) },
  // Overlap fixture scenarios (fields, pulleys, logic, circuits)
  ...(EXTRA_SCENARIOS as [string, string, unknown][]).map(([id, renderer, model]) => ({ name: `fixture-${id}`, render: () => RENDERERS[renderer]!(model) })),
];

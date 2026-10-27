# Toolkit handoff: Agent 1 → Agent 2

Branch: `kinetra/toolkit`, created from `main` at `0fa3117`. It is not
merged, and no PR has been opened.

## What was built

1. **Lock (commit `37831c7`, made before any toolkit code).** It lives in
   `packages/core/test/compat/` and runs under `npm test` and
   `npm run test:compat`.
   - **Golden snapshots** (`golden/`, 35 SVGs): every gallery example in
     `examples/render-diagrams.mjs`, the CLI `diagram` default, the
     docs/diagrams.md example, the `audit-diagrams` evidence SVGs, logic,
     timing and the overlap-fixture scenarios.
     - Each is compared byte-for-byte with a fresh render, and its sha256 is
       checked against `golden/manifest.json`.
     - A coverage test fails if a gallery example has no golden.
     - The CLI default is checked end to end through a subprocess.
     - `.gitattributes` marks goldens `-text` so CRLF checkouts cannot alter them.
   - **API lock** (`api-lock.json`, `api_lock.test.ts`): it records 366 core
     runtime exports (kind and arity), the CLI usage lines, `diagram --help`,
     every npm script and sha256 hashes of all 32 plugin files. Removing or
     changing any of these fails the test; additions are allowed.
   - **Style contract** (`docs/toolkit/style-contract.md`,
     `src/toolkit/style.ts` `checkToolkitStyle`): it was extracted from the
     Scene2D template goldens. 14 template goldens are tested to conform, and
     the checker is tested to reject off-contract SVG.
   - The writers (`write_golden.ts`, `write_api_lock.ts`) refuse to overwrite.
     **Never regenerate a golden to make a test pass.**
2. **Toolkit** (`packages/core/src/toolkit/`, about 2,500 lines). Every task is
   documented in `docs/toolkit/engine.md`.
   - Composition format: `types.ts`.
   - Resolver for relations and anchors: `resolver.ts`.
   - Expressions with units, built on `math/expression`, `math/eval` and `units`: `expr.ts`.
   - Declared and automatic checks: `checks.ts`.
   - Text metrics: `text_metrics.ts`.
   - View-space collision geometry: `geometry.ts`.
   - Overlap gate: `gate.ts`.
   - Label placement (greedy, local search, leaders): `labels.ts`.
   - Orchestration and rendering through `renderScene2D`: `compose.ts`.
   - Basic parts and the part registry: `parts.ts`.
3. **Additive wiring.**
   - Core: `export * from "./toolkit/index.js"` in `packages/core/src/index.ts`.
   - CLI: the `compose <model.json> <out.svg>` subcommand
     (`packages/cli/src/workflows/compose.ts`, plus one usage line).
   - npm scripts: `test:compat`, `test:toolkit`, `typecheck:toolkit`,
     `compose` and `examples:toolkit`.
   - `packages/core/tsconfig.toolkit.json` and `scripts/typecheck-toolkit.mjs`.
4. **Examples** (`examples/toolkit/`, basic shapes only): `block-on-incline`
   (vectorSum and friction inequality), `seesaw-moments` (momentSum),
   `ball-on-ramp` (tangency, onCurve), `kcl-node` (current scale, KCL) and
   `parabola-table` (curve, table, onCurve). `npm run examples:toolkit` writes
   them to `out/toolkit/`; I inspected each render visually.

## Test counts

| Command | Baseline (main) | Final (this branch) |
| --- | --- | --- |
| `npm test` | 297/297 | 428/428 (297 original + 56 compat + 75 toolkit) |
| `npm run test:diagrams` | 82/82 | 82/82 |
| `npm run audit:diagrams` | 9/9 | 9/9 |
| `npm run typecheck:diagrams` | pass | pass |
| `npm run test:plugin` | 6/6 | 6/6 |
| `npm run test:compat` | — | 56/56 |
| `npm run test:toolkit` | — | 75/75 |
| `npm run typecheck:toolkit` | — | pass (see the open issues) |
| `npm run test:textbook` | not runnable here: Python cairo is missing | unchanged and not run |

No existing test or file was modified, skipped or loosened.

## Proof that the golden outputs are unchanged

The goldens were written from `main`'s code before any toolkit source existed,
in commit `37831c7`. On the final branch:

- The 35 `compat golden: ... renders byte-identically` tests pass.
- `golden/manifest.json` has sha256 `6a6d3e0f62bbd646521a7d28bf27aae18dfb180b8e88bb1c2ae52f8f5f726b73`.
  It has not changed since `37831c7`; check with `git diff 37831c7 -- packages/core/test/compat/golden`.
- The API lock (`api-lock.json`, sha256 `8fdfd136…f5de`) passes.

The only edits to shared files are additive: one export line in `index.ts`,
the CLI dispatcher and its usage line, and new keys in `package.json`.

## Fuzz totals

The fuzz test is `packages/core/test/toolkit/fuzz.test.ts`, with seed
20261027 and 320 cases. Its oracle is independent of the gate: it re-parses
the SVG for label backdrops and lines.

```text
FUZZ_TOTALS {"cases":320,"elements":2080,"labels":1183,"leaders":25,"checks":136,"contacts":324,"pairsTested":724,"collisions":0,"outOfBounds":0,"nonFinite":0,"oracleProblems":0,"styleViolations":0}
FUZZ_NEGATIVE {"cases":320,"rejected":320}
```

All 320 valid compositions render with 0 collisions, 0 out-of-bounds values, 0
non-finite values, 0 style-contract violations and 0 oracle findings. Every
tenth case is checked for determinism. In the negative arm, all 320
compositions that include a duplicated element without `mayTouch` are rejected
with `E_COLLISION`.

## Error codes

The codes are E_SCHEMA, E_DUPLICATE_ID, E_UNKNOWN_PART, E_UNKNOWN_REF,
E_UNKNOWN_ANCHOR, E_EXPR_PARSE, E_EXPR_UNKNOWN_NAME, E_UNIT_MISMATCH,
E_NON_FINITE, E_INVALID_VALUE, E_SCALE_MISSING, E_UNDERCONSTRAINED,
E_CONTRADICTORY, E_AMBIGUOUS, E_CIRCULAR, E_CONSTRAINT_VIOLATED,
E_CHECK_FAILED, E_TEXT_UNSUPPORTED, E_STYLE, E_ARROW_TOO_SHORT, E_COLLISION,
E_OUT_OF_BOUNDS and E_LABEL_UNPLACEABLE.

`errors.test.ts` reproduces every code from a bad model and asserts that the
table is complete. Meanings are in `engine.md`.

## Open issues

These are known limits and pre-existing bugs, left untouched because existing
code is frozen.

- **`workflow-a` crashes on `main`.** `dld/truth_table.ts` raises
  `variable is not defined`, so its XOR schematic has no golden. Logic is
  covered by other goldens.
- **Pre-existing type error.** `math/eval.ts:73` references an undefined
  `derivative`. `typecheck:toolkit` lists it as pre-existing and fails only on
  errors in toolkit-owned files. The toolkit never builds `deriv` nodes.
- **Kinetra expression-parser quirks** (`math/expression.ts`): a number before
  `)` is read as implicit multiplication; a leading `p` is read as π, `S` as Σ
  and `d/` as a derivative; unary minus binds tighter than `^`. The toolkit
  avoids all of these by aliasing every literal and name to `q_<n>`, adding
  explicit `*` and rewriting unary minus, so expressions written for the
  toolkit are unaffected.
- **Fixed stroke widths.** Scene2D draws rect, circle and polygon strokes at
  1 px and vector shafts at 1.6 px, so the toolkit cannot choose other widths
  for those shapes.
- **Capital subscripts.** Labels use Unicode sub/superscripts, which have no
  capital subscripts, so `F_N` is rejected (`E_TEXT_UNSUPPORTED`). Real
  `<tspan>` subscripts would need a Scene2D change, which is frozen.
- **Text width estimates.** Sub/superscript and unknown glyphs are measured
  conservatively (0.65 em and 1 em). Label boxes include Scene2D's backdrop
  heuristic, which can be wider than the glyphs.
- **No snapping or offset parameters.** Relations solve translation only;
  rotation is a property, never solved.
- **Label search limits.** The local search moves one blocking label. Leader
  search covers 4 radii × 16 directions.
- **Not linked from the README.** `README.md` does not yet mention the
  toolkit; Agent 3 may add a pointer.
- **Untested on CRLF clones.** The goldens are protected by `.gitattributes`,
  but I have not verified a fresh clone with `core.autocrlf=true` from the
  remote.

## What Agent 2 must know

- **Read the part interface first.** It is the "Part interface" section of
  `engine.md`, and `parts.ts` is the reference implementation.
- **Where new parts go.** Add physics and electronics parts as new files that
  call `registerPart`, and import them from `toolkit/index.ts`. Do not edit
  `primitives.ts` or `scene2d.ts`; goldens lock them.
- **What a part must provide.**
  - **Collision shapes.** `collide()` must bound everything that `draw()`
    paints, in view pixels with stroke widths included. The fuzz oracle and
    the gate depend on this.
  - **Quantities.** Arrows that encode quantities should go through the
    `quantity()` hook, so `vectorSum`, `momentSum` and the automatic scale
    check work.
  - **Tangency.** Expose `radius()` or `segment()` to support `tangentTo`.
  - **Containment.** Expose `outline()` for closed parts.
- **Extend the tests.** Add new parts to the fuzz generator's kind list, and
  add one bad-model case per new failure mode in `errors.test.ts`. A new error
  code must also be added to `TOOLKIT_ERROR_CODES`.
- **Run before handing off.** Run `npm test`, `npm run test:compat` and
  `npm run typecheck:toolkit`. The compat tests must stay green without
  regenerating anything.


# Toolkit handoff: Agent 2 → Agent 3

Branch: `kinetra/toolkit`, continued from Agent 1's `6368a7e`. It is not
merged, and no PR has been opened.

## What was built

1. **A library of 92 part types** in `packages/core/src/toolkit/parts/`, on
   top of Agent 1's 11 basic shapes (103 types in all). Every part has:
   - named anchors;
   - exact collision shapes, derived from what it draws;
   - a catalogue entry and a sample;
   - unit tests and fuzz coverage.

   | Category | Parts | Types |
   | --- | --- | --- |
   | General | 12 | roundedBox (tfBlock), circleNode, textBlock, curvedArrow, doubleArrow, connector (signal: straight, orthogonal-routed or curved), brace, dimension, angleArc, leader, legend, table |
   | Mechanics and structures | 21 | beam, pinSupport, rollerSupport, fixedSupport, hinge, ground (wall, ceiling), pulley, rope (exact tangency), coilSpring (adaptive coils), damper, mass, pivot, spokedWheel, incline, truss, cable, gear, pointLoad, distributedLoad, moment, triad |
   | Fields and E&M | 8 | charge, pageVector (dot/cross), magnet (bar, horseshoe), solenoid, plates, fieldGrid, fieldLine, currentArrow |
   | Fluids and thermo | 8 | tank, pipe, valve, pump, pistonCylinder, heatFlow, reservoir, liquidSurface |
   | Circuits | 27 | resistor, capacitor, inductor, voltageSource, currentSource, switch, circuitGround (the 7 template kinds, wrapped), battery, cell, bulb, ammeter, voltmeter, ohmmeter, galvanometer, diode, zener, led, acSource, potentiometer, fuse, spdtSwitch, pushButton, bjt, mosfet, opamp, wire, junction |
   | Logic and controls | 7 | logicGate (IEC wrapping logic_schematic.ts, plus ANSI), flipFlop, summingJunction, takeoff, state, transition, selfLoop |
   | Plots | 9 | axes (linear/log, ticks, units, grid, y2, box/cross frames), series (fn, parametric, polar, data), shade, plotPoint, guideLine (asymptote), slopeTriangle, intercept, polarAxes, phasor |

   Aliases cover two of the requested items:
   - block-diagram blocks are `roundedBox` (alias `tfBlock`);
   - signal arrows are `connector` (alias `signal`).
2. **A connector router.** `routeOrthogonal`, exported as
   `toolkitRouteOrthogonal`, routes orthogonally around the endpoint parts and
   any `avoid` parts. It penalises bends and crossings of the connectors listed
   in `avoid`. No general graph-layout engine was added.
3. **Wrapping, not modifying.** `circuit_schematic.ts` and `logic_schematic.ts`
   are untouched; their `SYMBOL` table is module-private, so it cannot be
   imported. The toolkit symbols reproduce the originals, and tests prove the
   match:
   - Pin positions of the resistor, capacitor, inductor, voltage source,
     current source and switch are compared with `renderSchematic`'s own wire
     endpoints at three rotations.
   - The resistor's zig-zag vertices and stroke width are compared with the
     template path.
   - Gate terminals are compared with `logicTerminals` for 1–6 inputs.

   The template inductor's bumps hang below the axis, and the toolkit
   reproduces that; `flip` puts them above.
4. **The catalogue, `docs/toolkit/parts.md`.** `npm run docs:toolkit-parts`
   generates it, and a test fails if it is stale.
5. **Contact sheets.**
   - **Files:** `docs/toolkit/contact-sheet/{general,mechanics,fields,fluids,circuits,logic,plots}.svg`
     and `.png`, plus renders of the worked examples in
     `docs/toolkit/contact-sheet/examples/`.
   - **Command:** `npm run contact-sheet:toolkit`. PNGs need a local Chrome or
     Edge; set `KINETRA_CHROME` to override the path.
   - **Checked by the engine:** each sheet is itself a composition, so it
     passes the gate and the style contract.
   - **Visual review:** I inspected every sheet and example and fixed what
     looked wrong:
     - left-aligned text drift;
     - symbol labels that fell back to leader lines;
     - a polar ring label under a spoke;
     - an angle mark touching its incline's edge;
     - tick labels colliding at the plot corner and under the y title;
     - a battery with reversed polarity.
6. **Ten worked examples** in `examples/toolkit/parts/`: beam reactions,
   Atwood machine, RC circuit, inverting amplifier, half adder, Bode plot, P–V
   cycle with shaded work, feedback loop, FSM and spring–mass–damper. Each
   declares checks, and they pass. The examples live in a subfolder because
   Agent 1's example test pins the exact list of files in `examples/toolkit/`.
7. **npm scripts** `contact-sheet:toolkit` and `docs:toolkit-parts` (additions only).

## Engine changes (additive only)

They are documented in `engine.md` under "Part library (Agent 2)".

- **Resolver hooks.** `PartDefinition.elementRefs` and `PartDefinition.link`
  are optional, and the resolver calls them only when a part defines them.
  Existing parts are unaffected.
- **Implicit contacts.** `PartInstance.touches` is merged into the gate's
  mayTouch allowances in `compose.ts`.
- **Strict text.** `CollisionShape.strict` and `strictDistance` in the gate
  mean that an allowed contact never excuses a line through a part's own
  text.
  - Only kit text is strict, so Agent 1's parts behave exactly as before.
  - Agent 1's fuzz totals are byte-identical to the numbers in their section.
- **Units.** `expr.ts` has a toolkit-local table of engineering units (kN,
  kPa, MPa, bar, litre, kJ, …); `units.ts` is unchanged.
- **Exports.** `toolkit/index.ts` adds `TOOLKIT_PART_CATALOG`,
  `TOOLKIT_PART_SAMPLES`, `defineToolkitPart`, `toolkitRouteOrthogonal` and
  their types. The API lock allows additions, and it passes.

## Test counts

| Command | Before (Agent 1 final) | After |
| --- | --- | --- |
| `npm test` | 428/428 | 1186/1186 (+758) |
| `npm run test:toolkit` | 75/75 | 833/833 |
| `npm run test:compat` | 56/56 | 56/56 (unchanged; goldens and api-lock untouched since `37831c7`) |
| `npm run test:diagrams` | 82/82 | 82/82 |
| `npm run audit:diagrams` | 9/9 | 9/9 |
| `npm run typecheck:diagrams` | pass | pass |
| `npm run typecheck:toolkit` | pass | pass (the same pre-existing error in `math/eval.ts`) |
| `npm run test:plugin` | 6/6 | 6/6 |

The new tests are in `packages/core/test/toolkit/`.

- **`parts_catalog.test.ts` (638 tests).** For each of the 92 parts:
  - its sample composes at 3 seeds and 2 zooms, and passes the style
    contract and an SVG oracle;
  - its collision shapes cover every painted pixel sample, checked by an
    independent oracle that samples each Scene2D shape;
  - every documented anchor resolves;
  - output is deterministic;
  - a duplicate is rejected with E_COLLISION, and an unknown key with E_SCHEMA;
  - it takes a label when it says it does;
  - it is documented.
- **`parts_behaviour.test.ts` (47 tests).**
  - Circuit pins and gate terminals match the templates.
  - Rope tangency, belt tangents and gear meshing are exact.
  - The router avoids obstacles and prefers the route that crosses no other
    connector.
  - Junctions are accepted only at real nodes.
  - Mechanics values are right: the distributed-load resultant, vectorSum with
    point loads, and truss counts.
  - Plot values are right: onCurve, shade area = ln 3, slope, root, log
    spacing and phasor re/im.
  - Both text rules hold.
- **`parts_errors.test.ts` (59 tests).** One bad model per new failure mode,
  checking the code, the element named and the message.
- **`parts_fuzz.test.ts` (2 tests)** and **`parts_examples.test.ts` (12
  tests).** The examples file includes the check that the catalogue is current.

No existing test was modified, skipped or loosened. Agent 1's E_UNKNOWN_PART
test uses `"spring"` as its example of an unknown type. The spring part is
therefore registered as `coilSpring` (alias `zigzagSpring`), and `"spring"`
stays unregistered.

## Fuzz totals

The parts fuzz is `parts_fuzz.test.ts`, with seed 20261028 and 300 cases.

- **Cases.** Random grids of random part samples, with seeded variation,
  labels, zoom, title and caption.
- **Checks.** Every case goes through the gate, the style checker, the SVG
  oracle and the paint-coverage oracle; every tenth case is also checked for
  determinism.

```text
PARTS_FUZZ_TOTALS {"cases":300,"elements":5533,"partTypes":92,"labels":1136,"leaders":53,"contacts":3109,"pairsTested":3648,"collisions":0,"outOfBounds":0,"nonFinite":0,"oracleProblems":0,"styleViolations":0,"paintSamplesUncovered":0}
PARTS_FUZZ_NEGATIVE {"cases":300,"rejected":300}
```

- All 92 part types appear.
- Agent 1's basic-shape fuzz (`fuzz.test.ts`) is unchanged and still reports
  its original totals: 320 cases, 0 problems, 320/320 negatives rejected.
- In the parts fuzz, parts drawn inside a plot frame get only short labels. A
  long label cannot fit between a small cell's grid lines, and the engine
  correctly reports E_LABEL_UNPLACEABLE.

## Open issues

- **Grid lines block labels.** Labels may not cross grid lines, because the
  SVG oracle rejects any line under a label backdrop. Labels inside dense plots
  or polar grids can therefore be unplaceable. Use fewer grid lines, a larger
  plot, short labels or a separate text element.
- **Router limits.**
  - It routes on the grid of obstacle edges and does not know the canvas, so a
    route can leave the canvas; the gate then reports E_OUT_OF_BOUNDS.
  - Ties are broken arbitrarily, so a route may bend early rather than at the
    obstacle.
  - Connectors avoid only the parts listed in `avoid`.
- **Contacts the parts cannot infer** still need `mayTouch`: phasors sharing
  the polar centre, wires crossing without a junction, and arrows starting on
  a body.
- **Wire nodes.** Wires meeting at a 3-way node need a `junction`, which grants
  their contact. Two wires meeting end to end should be one wire.
- **Units table.** The core `units.ts` has no kN and similar units; the
  toolkit-local table covers the common engineering ones. Expression names
  shadow units (a variable `m` replaces the metre), as Agent 1 documented.
- **Capital subscripts** are still unsupported because Unicode has no such
  glyphs (for example `R_A`, `T_H` and `R_f`). The samples use `R₁`, `T₁` and
  `Rf` instead.
- **Draw order.** Elements draw in dependency order. A `shade` must come before
  the series it sits under, unless that series bounds it; the shade then
  redraws the series edge on top.
- **Plot expressions** follow the engine's angle rules: write `sin(x rad)`.
  Angle-valued results such as `atan(x)` are plotted in degrees.
- **3D** is out of scope, as requested.

## Notes for Agent 3

- **Where to start.** Read `docs/toolkit/parts.md` and the examples in
  `examples/toolkit/parts/`. The contact sheets show every part.
- **Adding a part.**
  1. Call `definePart` (see `kit.ts`) and `addSample`. The catalogue, the docs
     test, the contact sheet, the per-part tests and the fuzz pick it up
     automatically.
  2. Run `npm run docs:toolkit-parts` and `npm run contact-sheet:toolkit`.
  3. Look at the sheet.
- **Fastest check for collision shapes.** The paint-coverage oracle
  (`uncovered` in `parts_helpers.ts`) catches a collision shape that misses
  something drawn.
- **README.** `README.md` still does not mention the toolkit.
- **Run before handing off:** `npm test`, `npm run test:compat`,
  `npm run typecheck:toolkit`, `npm run test:diagrams` and
  `npm run audit:diagrams`.


# Toolkit handoff: Agent 3 (final)

Branch: `kinetra/toolkit`, continued from Agent 2's `2481a03`. Agent 3 opens
the single pull request into `main`; it is not merged.

## What was built

1. **Priority fixes from Agents 1–2** (commit `438a17d`).
   - **Real sub/superscripts.** `F_N`, `V_{CC}`, `R_L`, `I_B`, `x^2` in labels
     and part text render as `<tspan font-size dy>`; measurement and label boxes
     include the script size and shift. The style contract gained a "Scripts"
     section and `checkToolkitStyle` enforces it. The rejection for capital and
     multi-letter scripts is gone; unknown `\symbols` and non-Latin script
     characters still raise `E_TEXT_UNSUPPORTED`. `formatLabelText` itself is
     unchanged (public API).
   - **Labels over grid lines** sit behind a white halo; curves, arrows, axes
     text and other labels still block them.
   - **Router bounds:** orthogonal routes stay inside the canvas.
   - **Built-in contacts** through a new optional `PartDefinition.contactWith`
     hook: phasors sharing the polar origin, and wires crossing without a
     junction. T-joints, shared corners and overlaps still fail; junction dots
     still appear only at real nodes.
   - **Expression parser:** untouched. `priority_fixes.test.ts` proves the
     toolkit workaround gives `-3^2 = -9` and handles numbers before `)`; the
     quirk is documented in `rules.md`.
2. **Proof set** (`examples/toolkit/proof/`, 30 diagrams; commit `c75232c`).
   Every requested topic, built only from toolkit parts. Two use small
   generators in `gen/` (dipole streamlines by RK4, root-locus branches by
   Durand–Kerner). `npm run proof:toolkit` writes the SVGs, the PNGs and
   `docs/toolkit/contact-sheet/proof.html`/`.png`. I looked at every render and
   fixed crowding, mis-sided labels, arrows overlapping body edges, a
   self-overlapping datapath loop and low-contrast guide labels.
3. **Weaknesses found and fixed while building the proof set** (all additive,
   pinned by `proof_fixes.test.ts`):
   - checks could not read positions: added `<id>.<anchor>.x/.y`;
   - filled media (glass, fluid) forced `mayTouch` on everything: `background: true`;
   - leaders and arrows could not cross grid lines: grid strokes are soft for
     other elements' lines (part text still strict);
   - a plot marker blocked its own label: marker-sized label extent;
   - current arrows and crossing signal connectors needed `mayTouch`: built-in contacts;
   - connector `via` needed two points: one is enough now;
   - no `eV`/`nm`: added eV, keV, MeV, nm, um, pm;
   - errors showed script carrier code points: messages and reports use plain text.
   The checks also caught real mistakes in my own drafts: friction drawn down
   the slope (incline), uneven FSM spacing from `rightOf` measuring bounding
   boxes, and a 0.2 mm stage-gap drift in the datapath.
4. **Rules** (`docs/toolkit/rules.md`) and the plugin skill
   `packages/plugin/skills/kinetra-compose/` (`SKILL.md`, `agents/openai.yaml`):
   the seven rules, practical rules from the proof set, a cheat-sheet of parts,
   anchors, relations and checks, and six worked examples.
5. **Docs:** a "Toolkit" section in `README.md`, `docs/toolkit/index.md`, an
   "Agent 3 additions" table in `engine.md` and the "Scripts" section in
   `style-contract.md`. `npm run proof:toolkit` is a new script.

## Tests changed on purpose (and why)

Four existing assertions tested behaviour that the priority fixes were asked
to remove or that adding a skill necessarily changes. Each was replaced by an
equally strict assertion of the new behaviour; nothing was skipped or loosened.

| File | Before | After |
| --- | --- | --- |
| `errors.test.ts` | `E_TEXT_UNSUPPORTED` reproduced with label `F_Q` | reproduced with `\foo_Q` (unknown symbol); `F_Q` now renders |
| `parts_errors.test.ts` | part text `F_N` rejected | `\foo_N` rejected, plus a new case for a non-Latin script character |
| `parts_behaviour.test.ts` | crossing wires without a junction must collide | they compose with the contact reason and no dot; T-joints, shared corners, collinear overlaps and near-corner crossings must still collide |
| `parts_helpers.ts` (SVG oracle) | no line under a label backdrop | same, except `#eee` grid lines under a backdrop that a white halo rect fully covers |
| `compat/api-lock.json` | README.md hash `2d665354…` | `4e820495…`: `packages/plugin/README.md` gained the `kinetra-compose` row, which the plugin structure test requires for every skill. Decided with the user; no other lock entry changed |

## Test counts

| Command | Before (Agent 2 final) | After |
| --- | --- | --- |
| `npm test` | 1186/1186 | 1297/1297 (+111) |
| `npm run test:toolkit` | 833/833 | 944/944 |
| `npm run test:compat` | 56/56 | 56/56 |
| `npm run test:diagrams` | 82/82 | 82/82 |
| `npm run audit:diagrams` | 9/9 | 9/9 |
| `npm run typecheck:diagrams` | pass | pass |
| `npm run typecheck:toolkit` | pass (1 pre-existing error elsewhere) | same |
| `npm run test:plugin` | 6/6 | 6/6 |

New test files: `priority_fixes.test.ts` (10), `proof_fixes.test.ts` (9),
`proof_set.test.ts` (91: a presence test, then for each diagram a
compose/gate/style/determinism test, an independent-physics test and a
wrong-physics mutation test).

Fuzz (unchanged seeds): basic 320 cases, 0 collisions, 0 out of bounds,
0 oracle or style problems, 320/320 negatives rejected; parts 300 cases, all 92
types, 0 problems, 300/300 negatives rejected. Pairs and contacts differ
slightly from Agent 1–2's numbers (719 vs 724, 3642 vs 3648) because grid
strokes are now low priority.

## Compat proof

- `git diff 37831c7 -- packages/core/test/compat/golden` is empty;
  `golden/manifest.json` sha256 is still `6a6d3e0f…5f726b73`; the 35
  byte-identical golden tests pass.
- Core exports, CLI usage, `diagram --help`, npm scripts (one added) and every
  plugin file except the README row above match the lock.

## Known gaps

- The toolkit verifies the diagram against the agent's declared model. It
  cannot tell whether that model is the right physics.
- Structural diagrams (FSM, flowchart, datapath, K-map) have weaker in-model
  checks (layout, tables); their logic is verified by the proof tests outside
  the model.
- Part text (tick labels, leader text) gets no halo, so it still may not sit
  on grid lines.
- Captions and titles take no markup.
- `rightOf`/`leftOf` gaps are measured between bounding boxes, which include
  initial arrows, rings and strokes; use `at` with formulas for exact spacing.
- Untested on a fresh `core.autocrlf=true` clone (goldens are `-text`).

## Known issues outside the toolkit (not fixed, existing code is frozen)

- `workflow-a` crashes on `main`: `dld/truth_table.ts` raises
  `variable is not defined`.
- `math/eval.ts:73` references an undefined `derivative` (TypeScript error
  TS2304); `typecheck:toolkit` reports it as pre-existing.

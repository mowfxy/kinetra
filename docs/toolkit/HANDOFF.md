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

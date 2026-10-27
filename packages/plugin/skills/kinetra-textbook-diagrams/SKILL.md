---
name: kinetra-textbook-diagrams
description: Render textbook-style straight-wire magnetic fields, solenoids, and simplified reactor-loop cutaways with bundled deterministic Python tools, measured typography, explicit depth ordering, and geometry checks. Use for these static educational illustrations, including reversed current, varying coil turns, and long labels. Use kinetra-diagrams for other supported physics families. Custom subjects require new verified templates and are not covered by these checks.
---

# Kinetra Textbook Diagrams

Use the bundled renderer for its supported families. Do not redraw these scenes
freehand or substitute image generation: connections, current direction, winding
geometry, typography and callout layout are encoded in the tools. This skill is
self-contained and may be copied into Codex's skills directory or imported as
part of the Kinetra plugin; it does not require the TypeScript repository.

## Run

Resolve paths relative to this SKILL.md, regardless of the current directory.
Requires Python 3.10+ and the dependencies in `scripts/requirements.txt`.
Install into a local virtual environment when dependencies are missing:

```sh
python -m venv .venv
```

Use `.venv/Scripts/python` on Windows or `.venv/bin/python` on macOS/Linux for
the following commands. CairoSVG also needs a working system Cairo library;
report a missing-library error rather than skipping the PNG review.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/render.py assets/solenoid.json output/solenoid.svg
```

Replace the example paths with absolute skill paths when running elsewhere.
Write output into the user's workspace, not into the installed skill. The CLI
exports SVG, PNG, the input model, and a `.report.json` geometry report. Text is
outlined from the bundled OFL font, preserving exact measured glyph geometry
on other machines; accessible names remain in the SVG.

## Author and verify

1. Choose the exact supported family and read [the model contract](references/models.md).
   Copy an example JSON and edit only documented parameters. Do not approximate
   an unsupported apparatus with a different supported system.
2. Run the renderer. Invalid parameters, unknown fields, unsupported glyphs,
   overlapping text, text over registered geometry, and clipped content fail
   the export. Repair the input; do not bypass checks, shrink fonts, delete
   required labels, or patch the generated SVG to conceal failures.
3. Inspect the actual PNG at its exported size and enlarged. Compare against
   the corresponding reviewed reference PNG in `references/verified/`.
   Confirm arrows, field direction, depth order, connections, and legible
   callouts. Numbered disks intentionally overlay objects and match the legend.
   A geometry report alone does not constitute visual approval.
4. Deliver the SVG and PNG with the model, report, relevant assumptions, and
   any unresolved limitation. The report deliberately marks visual inspection
   as required; do not claim automatic checks establish universal accuracy.

For renderer changes, run `python scripts/test_render.py` and inspect affected
output before accepting it. Do not replace a baseline merely to pass a test.
The committed reference PNGs are also regression baselines; refresh them only
after reviewing the changed physics and rendering. The regression test allows
small rasterizer antialiasing differences, not layout changes.

## Coverage boundary

The templates support bounded variants, not arbitrary three-dimensional models.
Field curves communicate topology and direction; they are not a numerical field
solution. The reactor is an educational energy-flow cutaway, not engineering CAD.
Use the subject references below to check assumptions, not as images to trace.

For an uncovered family, use an available specialized skill first. If none
covers it, create a separate parameterized template using the measured layout
and checks in `scripts/layout.py`; specify its valid ranges, geometry and
connections, add physics/geometry tests, render boundary cases and long labels,
and save a visually reviewed reference. Until those checks exist and pass,
label the result as a custom illustration with unverified aspects. Instructions
alone must not promote it to verified coverage.

Scientific references: [OpenStax solenoids](https://openstax.org/books/university-physics-volume-2/pages/12-6-solenoids-and-toroids)
and [NRC pressurized-water reactors](https://www.nrc.gov/reactors/power/pwrs).

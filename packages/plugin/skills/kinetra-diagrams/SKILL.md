---
name: kinetra-diagrams
description: Create accurate technical and physics diagrams using Kinetra renderers or a custom illustration fallback when no available specialized skill covers the requested figure, including static 3D apparatus views. Use for labeled educational diagrams, free-body diagrams, projectile motion, optics, pulleys, fields, and charged rods. Route circuit schematics to kinetra-circuits. Do not use for production CAD or animation/video.
---

# Kinetra Diagrams

Route into the Kinetra 2D physics diagram engine. All renderers are
deterministic: the same model produces the same SVG. Determinism does not
establish physical correctness: verify the model assumptions and inspect the
rendered figure. Six diagram families are supported.

## When to activate

- User describes a physics scene and asks for a diagram.
- User posts equations and wants the corresponding free body / field
  visualization.
- User asks to convert a textual problem ("block on incline at 30 deg,
  mass 5 kg, friction mu=0.2") into a labeled SVG.

For circuit diagrams use kinetra-circuits. Prefer another available specialized
skill when it covers the requested subject or output. For uncovered static
technical illustrations, use the fallback below. Production CAD and
animation/video remain outside this skill.

## Fallback for an uncovered figure

Do not substitute the nearest supported example if that changes the requested
apparatus, topology, or physical meaning. Keep supported renderers for the parts
they represent correctly; create a custom SVG or an appropriate programmatic
3D scene for the missing geometry. This is an authoring fallback, not a claim
that the core engine now supports or solves the new system.

1. Establish the required objects, connections, dimensions, labels, viewpoint,
   and physical relationships from the request and supplied references. Use
   relevant available skills for their actual expertise. For unfamiliar science
   or symbol conventions, consult authoritative references before drawing; state
   consequential assumptions rather than inventing missing facts.
2. Construct geometry from explicit coordinates and parameters. Independently
   check units, scale, signs, force/ray directions, connectivity, and any computed
   values against the underlying equations or reference. Mark schematic or
   not-to-scale views where applicable. Appearance must not imply an unsupported
   calculation or a physically impossible arrangement.
3. For depth, use a consistent perspective or orthographic projection, coherent
   occlusion, aligned cylinder ends/axes, and consistent lighting and shading.
   Ropes, supports, wires, and arrows must attach to the intended surfaces or
   terminals. Use cutaways, dashed hidden edges, or a second view when needed
   to expose important relationships. Decorative shading must not obscure them.
4. Match the clarity and finish of the reviewed examples and relevant skills:
   legible typography, consistent strokes and arrowheads, balanced whitespace,
   clear depth cues, and restrained colors with meaningful contrast. Preserve
   the user's reference style where supplied without copying its errors.
5. Apply the visual acceptance pass below before delivery. Save the editable
   source/model and final export so corrections remain reproducible. If tools or
   evidence prevent verification, identify exactly what remains unverified and
   deliver the best supported result without claiming it is fully validated.

## Visual acceptance for every figure

These checks apply to both built-in output and custom fallback illustrations.

- Render the actual final export and inspect it at its intended display size
  and enlarged. Compare with supplied references and the reviewed gallery when
  relevant; passing numeric tests or inspecting SVG source is insufficient.
- Fix unintended label-label overlaps, text touching geometry, clipped content,
  crowded dimensions, ambiguous leaders, and arrows hidden behind objects.
  Place labels outside busy regions and route leaders to unambiguous anchors;
  enlarge or rearrange the composition instead of shrinking text excessively.
- Distinguish intentional intersections from errors: ray intersections, connected
  terminals, and physical occlusion may be necessary. Verify that crossings,
  junction dots, hidden lines, depth order, and attachments communicate the
  intended relationships without ambiguity.
- Inspect 3D projection, proportions, visible/hidden surfaces, and shading
  separately from scientific correctness. Re-render after corrections and check
  the final artifact again. For a batch, inspect every figure; for a reusable
  layout, also exercise long labels, dense inputs, and target output sizes.
- Report unresolved visual defects or uninspected output explicitly. Never
  promise overlap-free arbitrary inputs or general 3D support based on a few
  polished examples.

## Core entry points

All paths are relative to the repo root.

```ts
import { renderFBD, buildSceneFromFBD, validateFBD } from "../../../../core/src/diagram/freebody.js";
import { renderProjectile, buildSceneFromProjectile, projectileAnalytics, validateProjectile } from "../../../../core/src/diagram/projectile.js";
import { renderPulley, buildSceneFromPulley, mechanicalAdvantage, validatePulley } from "../../../../core/src/diagram/pulley.js";
import { renderOptics, buildSceneFromOptics, lensImage } from "../../../../core/src/diagram/optics.js";
import { renderVectorField, renderScalarField, validateVectorField } from "../../../../core/src/diagram/fields.js";
import { renderPlotSvg } from "../../../../core/src/graph/render_svg.js";
import { samplePlot, sampleMulti } from "../../../../core/src/graph/sample.js";
import { defaultElectrostaticRods, renderElectrostaticRods, validateElectrostaticRods, electrostaticForcePair } from "../../../../core/src/diagram/electrostatics.js";
```

## Per-family workflow

### Textbook charged-rod apparatus

Use `defaultElectrostaticRods()` as a starting model, then set the two rods'
positions, material, labels, charge signs, charge patches, and suspension.
`renderElectrostaticRods(model)` generates shaded cylinders, attached threads,
localized charge marks, and equal/opposite force arrows. Opposite signs attract;
like signs repel. The optional rotation cue indicates freedom to turn, not a
calculated angular velocity. This is a qualitative illustration of distributed
charges, not a point-charge Coulomb calculation or a full free-body diagram.

For the repo CLI, run `npm run diagram` for the default figure, or
`npm run diagram -- examples/charged-rods.json out/diagrams/custom.svg` for an
editable JSON model. `npm run examples:diagrams` creates a gallery under
`out/diagrams/`. Coordinates use +y up; rods must be separated and the fork
and support must be above the suspended rod. Never trace charge/force arrows
as decorative elements independent of the model.

### Free body diagram

1. Build an `FBDModel` with `bodyPosition`, `bodySize: {w, h}`,
   `frameAngleDeg`, `forces: FBDForce[]`, `world: {xMin, xMax, yMin,
   yMax}`, and `width` / `height`. Optional: `constraints`,
   `velocity`, `acceleration`, `dimensions`, `annotations`,
   `frameLabels`, `bodyLabel`.
2. Call `validateFBD(model)` before rendering; reject inconsistent
   magnitudes.
3. Render with `renderFBD(model)` directly, or normalize first with
   `buildSceneFromFBD(model)` then render.
4. `forceScale` is a common world-units-per-force scale (auto-fit by default).
   `showComponents` projects into the chosen `frameAngleDeg`; `bodyAngleDeg`
   controls the box orientation independently. Verify the actual forces from
   the problem: the renderer does not infer normals, friction or equilibrium.

### Projectile

1. Build a `ProjectileModel` with `initialPosition`, `initialSpeed`
   (m/s), `launchAngleDeg` (above horizontal), `gravity` (m/s^2,
   positive; explicitly supply 9.81 for Earth), `width`, `height`. Optional: `tMax`,
   `samples`, `showInitialVectors`, `showKeyPoints`, `world`,
   `drag` (only zero is supported; nonzero values are rejected).
2. Compute analytics with `projectileAnalytics(model)` -> returns
   `{apex: { time, position }, range: { time, distance }, flightTime,
   maxHeight }` (verify exact shape in `projectile.ts`).
   - Apex time is `vy / g` when `vy > 0`; otherwise 0 (no apex).
   - Flight time is the positive root of `y(t) = 0` after the apex
     (when `vy > 0`) or simply the positive root (when `vy <= 0`).
     This works for horizontal launches (`vy = 0`), downward launches
     (`vy < 0`), and ground-level launches (`y0 = 0`).
   - Ground is y=0. Below-ground launches and zero gravity are rejected.
   - The rendered trajectory stops at impact or an earlier requested `tMax`.
     Future apex/impact labels are omitted for a partial interval.
3. `validateProjectile(model)` then `renderProjectile(model)`.
4. Surface `apex.time`, `apex.position.y` (max height),
   `flightTime`, and `range.distance` alongside the SVG.

### Pulley

1. Build a `PulleyModel` with `pulleys: { center, radius, fixed,
   label? }[]`, `masses: { mass, position, size: {w,h}, label? }[]`,
   `tension` (N, >= 0), `world`, `width`, `height`. Optional: `title`.
2. `validatePulley(model)` enforces at least one pulley, one mass,
   non-negative tension.
3. Supported routes are a single fixed wheel, an Atwood pair over one or
   two fixed wheels, and `configuration: "movable"` with one moving wheel
   and one load below its axle. The movable route explicitly anchors one
   end at the support and lifts the other: MA=2. Fixed routes have MA=1.
   General compound routing is rejected; do not infer MA from wheel count.
   For vertical Atwood motion place loads under the wheel's outer tangent
   contacts. Tension is supplied by the caller; use `atwoodDynamics` in
   `pulley.ts` when the ideal Atwood assumptions apply.
4. `buildSceneFromPulley(model)` then `renderPulley(model)`.

### Optics

1. Build an `OpticsModel` with `element: OpticalElement`
   (plane-mirror / concave-mirror / convex-mirror / thin-lens-
   converging / thin-lens-diverging), `objectHeight`, `objectBase:
   Vec2`, `world`, `width`, `height`. Optional: `title`.
2. Compute the image with `lensImage(model)` -> returns
   `{imageHeight, imageBase, magnification, rayPath, virtual, atInfinity}`.
   Incoming light travels left to right. Supply a positive focal length for
   converging lenses/concave mirrors and negative for diverging lenses/convex
   mirrors. Spherical `radius` must equal `2*abs(focal)`. The object base
   lies on the element's optical axis. Rays use the ideal paraxial model;
   curved mirror outlines are schematic. `atInfinity` marks an object at
   focus; do not format its infinite analytics as a finite image position.
   The renderer shows parallel outgoing rays and a caption for that case.
3. `buildSceneFromOptics(model)` then `renderOptics(model)`.

### Fields

1. `renderVectorField(model: VectorFieldModel)` where `model = {type:
   "vector", field: VectorField2D, world, width, height, cols, rows,
   scale?, encoding?, title?}`. `field` is `(p: Vec2) => Vec2`. Equal-length
   direction arrows are the default and labeled accordingly. Use
   `encoding: "magnitude"` for lengths proportional to field magnitude.
   Grid dimensions must be finite integers from 2 through 200.
2. `renderScalarField(model: ScalarFieldModel)` where `model = {type:
   "scalar", field: ScalarField2D, world, width, height, cols, rows,
   title?, contours?: number[]}`. `field` is `(p: Vec2) => number`.
   Contours use piecewise-linear interpolation over a triangulated grid;
   refine the grid to resolve curved level sets. Undefined samples are
   gray and excluded from contour geometry. Supply pure field callbacks.
3. For time-varying plots of `f(t)` or `f(x)`, prefer `renderPlotSvg`
   from the graph engine; sample with `samplePlot` / `sampleMulti`.

## What to hand back

- The SVG path and a rendered preview when possible.
- The key analytic quantities (apex height, image distance, MA, etc.)
  in a small summary.
- The relevant model assumptions. Do not claim universal textbook accuracy
  from passing tests or reuse the old synthetic benchmark percentages.

## Common failure modes

- **Inconsistent units.** Reject mixes of mm/inches, deg/rad.
- **Negative lengths / mass / time constants.** Surface and ask.
- **Off-canvas geometry.** Set explicit `world` bounds; do not rely
  on auto-computation if the user has a fixed canvas in mind.
- **Invalid field grid.** Use finite integer cols/rows in [2,200].
- **Renderer drift.** Two consecutive renders must match
  byte-for-byte. If not, stop and report - determinism is
  load-bearing.

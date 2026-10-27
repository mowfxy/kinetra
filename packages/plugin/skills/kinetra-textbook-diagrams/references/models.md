# Model contract

Every input is a JSON object. Unknown keys fail. All coordinates are maintained
by the renderer; models cannot insert arbitrary SVG or reposition labels.

| Parameter | Accepted values |
| --- | --- |
| `family` | `straight-wire`, `solenoid`, `reactor-loop` |
| `width` | Integer 900–2400 pixels; default 1200. Equal scaling preserves geometry. |
| `title` | 1–140 characters, fitting at most two measured lines. |
| `labels` | Object of supported callout keys to 1–600 character strings. |
| `direction` | Magnetic families only: `up` (default) or `down`. For a solenoid this is the interior field direction; current arrows change consistently. |
| `fieldLines` | Magnetic families only: integer 2–5, default 4. Per side for solenoid. |
| `turns` | Solenoid only: integer 4–12, default 9. |

Labels wrap by measured glyph advances. Long words split, font size stays fixed,
and legend rows expand the canvas height. Missing font characters fail rather
than silently rendering replacement boxes. Output is an outlined SVG, so edit
the saved JSON and rerender to change text. Canonical font sizes are 21–30 units
(callout numbers 18); export widths below 900 are rejected for readability.

## Callout keys

- Straight wire: `wire`, `field`.
- Solenoid: `coil`, `field`.
- Reactor: `control`, `fuel`, `exchanger`, `primaryPump`, `generator`,
  `condenser`, `feedPump`, `cooling`.

Custom labels must preserve the meaning of the referenced object. The tool
can measure text, but cannot establish the truth of arbitrary supplied prose.

## Physical and visual construction

The straight wire uses projected concentric circles with rear halves behind the
conductor. Upward conventional current gives counterclockwise circulation when
viewed from above, with the near-side arrows pointing right.

The solenoid is one sampled helix, not stacked disconnected ellipses. Its winding
is parameterized as `(r cos(t), pitch*t, -r sin(t))`, with the axial coordinate
upward. Forward winding current gives an upward interior field. Reversing current
reverses the field arrows and pole labels together. Back winding segments are
painted before interior field lines and front segments afterward. Closed field
curves are schematic and do not encode magnitude or quantitative fringe fields.

The reactor has fixed, separate primary, secondary and cooling-water routes.
Primary water transfers heat through the exchanger wall; secondary steam drives
the turbine and returns through the condenser and pump. Cooling water stays in
its own tube. Crossing pipes use an occlusion gap, not a junction. Rods, pumps,
vessels, shaft and turbine are schematic; pressure regulation, containment detail
and safety systems are omitted. This is not a design or operational procedure.

The diagrams are original illustrations. The user's sample images are visual
targets, not copied assets. Reference physics: [OpenStax](https://openstax.org/books/university-physics-volume-2/pages/12-6-solenoids-and-toroids)
and [NRC](https://www.nrc.gov/reactors/power/pwrs).

## Acceptance scope

The renderer checks actual outlined text bounds, text/text collisions, text
against recorded stroked segments and body bounds, and canvas bounds. Numbered
disks intentionally overlay objects. These checks do not prove curve/curve
occlusion correctness or the scientific truth of custom labels. Template depth
order, topology tests, raster regression and final visual inspection cover
different aspects; all are necessary.

`verified/*.png` contains the three default renders visually reviewed on
2026-09-07, alongside 900-pixel dense/reversed, sparse and long-label variants.
The extra variants are generated during review and are not saved baselines.
Regenerate candidates
with `scripts/render.py assets/<family>.json <workspace-output>/<family>.svg`,
inspect them, then deliberately replace reviewed references if appropriate.
The `scripts/test_render.py` suite also exercises current reversal, parameter
boundaries, long labels, unsupported input, and isolated skill execution.

The bundled font is Old Standard TT Regular from
[Google Fonts](https://github.com/google/fonts/tree/main/ofl/oldstandardtt),
redistributed under the license in `assets/OFL.txt`.

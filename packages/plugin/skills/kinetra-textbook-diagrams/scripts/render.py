"""Self-contained, parameterized textbook illustration CLI. No repository imports."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

from layout import Figure

BLUE = '#317ea7'
COPPER = '#ba702a'


def cubic(a, b, c, d, count=60):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k]
                  for k in (0, 1)) for t in (i/count for i in range(count+1))]


def ellipse(cx, cy, rx, ry, start=0, end=2*math.pi, count=100):
    return [(cx+rx*math.cos(t), cy+ry*math.sin(t))
            for t in (start+(end-start)*i/count for i in range(count+1))]


def flow(fig, points, direction=1, color=BLUE, at=.5):
    index = max(1, min(len(points)-2, round(at*(len(points)-1))))
    a, b = points[index-1], points[index+1]
    if direction < 0:
        a, b = b, a
    fig.arrow(a, b, color)


def tube(fig, points, color, width=13):
    fig.polyline(points, '#71929e', width+3)
    fig.polyline(points, color, width)
    fig.polyline([(x, y-2) for x, y in points], '#ffffff', 2, record=False)


def validate(model):
    if not isinstance(model, dict):
        raise ValueError('Model must be a JSON object')
    allowed = {'family', 'width', 'title', 'labels', 'direction', 'turns', 'fieldLines'}
    if set(model)-allowed:
        raise ValueError('Unknown model keys: ' + ', '.join(sorted(set(model)-allowed)))
    family = model.get('family')
    if family not in ('straight-wire', 'solenoid', 'reactor-loop'):
        raise ValueError('Supported families: straight-wire, solenoid, reactor-loop')
    width = model.get('width', 1200)
    if type(width) is not int or not 900 <= width <= 2400:
        raise ValueError('width must be an integer from 900 to 2400; smaller exports compromise legibility')
    if not isinstance(model.get('labels', {}), dict):
        raise ValueError('labels must be an object')
    for key, value in model.get('labels', {}).items():
        if not isinstance(value, str) or not value.strip() or len(value) > 600:
            raise ValueError(f'Invalid label: {key}')
    if family == 'reactor-loop' and any(k in model for k in ('direction', 'turns', 'fieldLines')):
        raise ValueError('Reactor topology and flow direction are fixed; magnetic parameters do not apply')
    if family != 'reactor-loop':
        if model.get('direction', 'up') not in ('up', 'down'):
            raise ValueError('direction must be up or down')
        lines = model.get('fieldLines', 4)
        if type(lines) is not int or not 2 <= lines <= 5:
            raise ValueError('fieldLines must be an integer from 2 to 5')
    if 'turns' in model and family != 'solenoid':
        raise ValueError('turns applies only to solenoid')
    turns = model.get('turns', 9)
    if type(turns) is not int or not 4 <= turns <= 12:
        raise ValueError('turns must be an integer from 4 to 12')


def straight_wire(fig, model):
    direction = 1 if model.get('direction', 'up') == 'up' else -1
    lines = model.get('fieldLines', 4)
    cx, cy = 570, 395
    radii = [90+i*65 for i in range(lines)]
    # Back halves are drawn before the opaque conductor; front halves after it.
    for r in radii:
        fig.polyline(ellipse(cx, cy, r, r*.30, math.pi, 2*math.pi), BLUE)
    fig.rect(cx-12, 155, 24, 475, 'url(#rod)', 8)
    for r in radii:
        pts = ellipse(cx, cy, r, r*.30, 0, math.pi)
        fig.polyline(pts, BLUE)
        # Upward current: the near-side field runs to the right.
        flow(fig, pts, -direction, at=.37)
    fig.arrow((cx+62, 310 if direction > 0 else 200), (cx+62, 200 if direction > 0 else 310), COPPER, 3)
    fig.text('I', cx+84, 262, 27, COPPER)
    fig.badge(1, cx-42, 164)
    fig.badge(2, cx+radii[-1]+25, cy)
    fig.text('Conventional current ' + ('upward' if direction > 0 else 'downward'), 600, 683, 22, anchor='middle')
    fig.notes.append('Ideal long straight wire. Circular magnetic field lines, projected as ellipses. Direction follows the right-hand rule; line spacing is schematic.')
    fig.legend([('wire', 'Straight current-carrying conductor'), ('field', 'Magnetic field B: circular loops around the wire')], model.get('labels', {}))
    return {'current': direction, 'fieldCirculationViewedFromAbove': 'counterclockwise' if direction > 0 else 'clockwise', 'closedFieldLoops': lines}


def helix_points(turns):
    points = []
    for i in range(turns*120+1):
        theta = 2*math.pi*i/120
        # (x,y,z)=(r cos(theta), pitch*theta, -r sin(theta)) is +Y circulation.
        z = -78*math.sin(theta)
        points.append((600+78*math.cos(theta), 522-304*i/(turns*120)+.26*z, z))
    return points


def solenoid(fig, model):
    direction = 1 if model.get('direction', 'up') == 'up' else -1
    turns, lines = model.get('turns', 9), model.get('fieldLines', 4)
    coil = helix_points(turns)
    def winding(front):
        runs, run = [], []
        for a, b in zip(coil, coil[1:]):
            if ((a[2]+b[2])/2 >= -1e-8) != front:
                if run:
                    runs.append(run)
                    run = []
                continue
            if not run:
                run.append(a[:2])
            run.append(b[:2])
        if run:
            runs.append(run)
        for run in runs:
            fig.polyline(run, '#8d592d', 6)
            fig.polyline(run, '#edbc7c' if front else '#c89b62', 3)
    winding(False)
    for side in (-1, 1):
        for i in range(lines):
            inside, radius = 43-i*10, 135+i*42
            x, outside = 600+side*inside, 600+side*radius
            top, bottom = 218, 522
            pts = [(x, bottom), (x, top)]
            pts += cubic((x, top), (x, 100-i*9), (outside, 100-i*9), (outside, 370))[1:]
            pts += cubic((outside, 370), (outside, 640+i*9), (x, 640+i*9), (x, bottom))[1:]
            fig.polyline(pts, BLUE, 1.8)
            flow(fig, pts, direction, at=.48)
            # Inside segment points up for the default winding current.
            y = 325+i*28
            fig.arrow((x, y+20 if direction > 0 else y), (x, y if direction > 0 else y+20), BLUE, 1.6, head=6)
    winding(True)
    fig.polyline([(678, 218), (885, 218)], COPPER, 5)
    fig.polyline([(678, 522), (885, 522)], COPPER, 5)
    fig.arrow((800 if direction > 0 else 857, 218), (857 if direction > 0 else 800, 218), COPPER, 2.6)
    fig.arrow((857 if direction > 0 else 800, 522), (800 if direction > 0 else 857, 522), COPPER, 2.6)
    fig.text('I', 870, 195, 25, COPPER)
    fig.text('I', 870, 560, 25, COPPER)
    fig.text('N' if direction > 0 else 'S', 600, 118, 29, anchor='middle')
    fig.text('S' if direction > 0 else 'N', 600, 673, 29, anchor='middle')
    fig.badge(1, 705, 368)
    fig.badge(2, 285, 368)
    fig.text('Continuous winding · ' + str(turns) + ' turns', 600, 713, 21, anchor='middle')
    fig.notes.append('Qualitative finite-solenoid field. Closed curves show topology and direction, not computed field magnitude. Front winding passes over interior field lines; rear winding passes behind them.')
    fig.legend([('coil', 'Continuous helical conductor; arrows show conventional current'), ('field', 'Field returns outside from N to S and runs inside from S to N')], model.get('labels', {}), 766)
    return {'turns': turns, 'current': direction, 'northAt': 'top' if direction > 0 else 'bottom', 'closedFieldLoops': 2*lines, 'coilEndpoints': [coil[0][:2], coil[-1][:2]]}


def reactor(fig, model):
    # Separate circuits are embedded in fixed apparatus geometry. No arbitrary
    # user routing can merge primary, secondary, or external cooling water.
    fig.rect(115, 170, 385, 435, 'url(#metal)', 68)
    fig.rect(133, 189, 349, 396, '#edf3f4', 53)
    fig.rect(160, 244, 120, 280, 'url(#hot)', 47)
    fig.rect(345, 242, 113, 284, 'url(#water)', 48)
    # Cutaway rods and fuel elements; all terminate within the vessel.
    for x in (180, 205, 230, 255):
        fig.rect(x, 317, 8, 151, '#b94a29', 1, stroke='#aa552c')
    for x in (193, 220, 246):
        fig.rect(x, 205, 6, 154, '#546c79', 0)
    # Primary: core outlet -> heat exchanger -> primary pump -> core inlet.
    primary = [(280, 339), (320, 339), (402, 354)]
    primary += [(402+25*math.sin(t), 354+125*t/(10*math.pi))
                for t in (10*math.pi*i/400 for i in range(1, 401))]
    primary += [(402, 550), (221, 550), (221, 524)]
    tube(fig, primary, '#f3b577', 13)
    # Turbine and generator with a visible connecting shaft.
    fig.parts.append('<path d="M 683 187 L 727 159 L 727 294 L 683 268 Z" fill="url(#metal)" stroke="#718b95" stroke-width="2"/>')
    fig.solids.append((683, 159, 727, 294))
    fig.rect(727, 215, 28, 24, '#748d98', 2)
    fig.rect(755, 157, 210, 139, 'url(#metal)', 17)
    fig.rect(966, 180, 15, 93, '#b9cdd5', 2)
    # Condenser cutaway: steam surrounds the independent cooling tube.
    fig.rect(725, 384, 315, 192, 'url(#metal)', 28)
    fig.rect(738, 397, 289, 164, 'url(#water)', 20)
    secondary = [(402, 242), (402, 221), (683, 221)]
    tube(fig, secondary, '#a0e5ee')
    exhaust = [(705, 280), (705, 353), (865, 353), (865, 384)]
    tube(fig, exhaust, '#b8e4e9', 15)
    feed = [(785, 576), (785, 614), (433, 614), (433, 522)]
    tube(fig, feed, '#78cfdf')
    cooling = [(767, 665), (767, 492)]
    cooling += [(767+222*t/(12*math.pi), 460+32*math.cos(t))
                for t in (12*math.pi*i/480 for i in range(1, 481))]
    cooling += [(989, 665)]
    fig.polyline(cooling, '#ffffff', 21)  # Visible separation at the feedwater crossing.
    tube(fig, cooling, '#36b9da', 12)
    for x, y in ((293, 550), (576, 614)):
        fig.parts.append(f'<circle cx="{x}" cy="{y}" r="17" fill="url(#metal)" stroke="#668592" stroke-width="2"/><path d="M {x+6} {y-8} L {x-8} {y} L {x+6} {y+8} Z" fill="#567888"/>')
    fig.arrow((302, 321), (334, 329), '#c97937')
    fig.arrow((336, 571), (305, 571), '#c97937')
    fig.arrow((543, 199), (594, 199), BLUE)
    fig.arrow((889, 312), (889, 344), BLUE)
    fig.arrow((645, 638), (605, 638), BLUE)
    fig.arrow((742, 653), (742, 619), BLUE)
    fig.arrow((1014, 619), (1014, 653), '#c97937')
    # Number disks intentionally overlay apparatus; full labels live in a
    # measured legend instead of obscuring cutaways or crossing pipework.
    for n, x, y in [(1, 172, 221), (2, 177, 485), (3, 403, 278), (4, 321, 551),
                     (5, 838, 180), (6, 1004, 419), (7, 605, 613), (8, 876, 451)]:
        fig.badge(n, x, y)
    fig.text('Primary circuit', 165, 654, 22, '#aa6129')
    fig.text('Cold in', 730, 704, 21, BLUE)
    fig.text('Warm out', 966, 704, 21, '#aa6129')
    fig.notes.append('Simplified pressurized-water reactor energy-flow cutaway; not to scale. Primary water remains pressurized. Primary, secondary, and cooling circuits exchange heat without mixing. Pressurizer and safety systems omitted. Coiled exchanger geometry is illustrative, not a plant construction drawing.')
    fig.legend([('control', 'Control rods'), ('fuel', 'Fuel elements and reactor core'),
                ('exchanger', 'Steam generator: primary heat boils secondary water'),
                ('primaryPump', 'Primary coolant pump'), ('generator', 'Steam turbine, shaft and electric generator'),
                ('condenser', 'Condenser: exhaust steam becomes water'), ('feedPump', 'Secondary feedwater pump'),
                ('cooling', 'Separate cooling-water tube')], model.get('labels', {}), 766)
    return {'circuits': {'primary': ['core', 'heat-exchanger', 'primary-pump', 'core'],
                         'secondary': ['steam-generator', 'turbine', 'condenser', 'feedwater-pump', 'steam-generator'],
                         'cooling': ['cold-inlet', 'condenser-tube', 'warm-outlet']},
            'fluidMixing': False, 'primaryPath': primary, 'secondaryPaths': [secondary, exhaust, feed], 'coolingPath': cooling}


def build(model):
    validate(model)
    titles = {'straight-wire': 'Magnetic field around a straight wire', 'solenoid': 'Magnetic field of a solenoid', 'reactor-loop': 'Heat transfer in a pressurized-water reactor'}
    title = model.get('title', titles[model['family']])
    if not isinstance(title, str) or not title.strip() or len(title) > 140:
        raise ValueError('title must contain 1–140 characters')
    fig = Figure(title)
    title_height = fig.block(title, 50, 49, 1100, 30)
    if title_height > 82:
        raise ValueError('Title exceeds two lines; shorten it')
    semantic = {'straight-wire': straight_wire, 'solenoid': solenoid, 'reactor-loop': reactor}[model['family']](fig, model)
    footer = ('Simplified energy-flow cutaway · separate fluid circuits · not to scale'
              if model['family'] == 'reactor-loop' else
              'Schematic field lines · direction and topology shown · spacing does not encode magnitude')
    footer_height = fig.block(footer, 50, fig.height-5, 1100, 17, '#546c79')
    fig.height += footer_height+20
    svg = fig.svg(model.get('width', 1200))
    report = {'schemaVersion': 1, 'family': model['family'], 'checks': {'textOverlap': 'pass', 'textGeometry': 'pass', 'canvasBounds': 'pass'},
              'visualInspection': 'required', 'limitations': fig.notes, 'semantics': semantic,
              'labels': fig.labels, 'svgSha256': hashlib.sha256(svg.encode()).hexdigest()}
    return svg, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', type=Path, help='JSON input; see assets/*.json')
    parser.add_argument('output', type=Path, help='Output SVG path (also writes PNG and report)')
    args = parser.parse_args()
    if args.output.suffix.lower() != '.svg':
        parser.error('output must end in .svg')
    try:
        import cairosvg
        svg, report = build(json.loads(args.model.read_text(encoding='utf-8')))
        png = cairosvg.svg2png(bytestring=svg.encode())
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(svg, encoding='utf-8')
        args.output.with_suffix('.png').write_bytes(png)
        args.output.with_suffix('.report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
        args.output.with_suffix('.model.json').write_text(args.model.read_text(encoding='utf-8'), encoding='utf-8')
        print(f'Wrote {args.output}, PNG, model and geometry report. Inspect the PNG before delivery.')
    except (ValueError, ImportError, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()

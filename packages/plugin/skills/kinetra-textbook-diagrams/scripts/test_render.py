"""Run with Python; includes image regressions and isolated-package execution."""
import io
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import cairosvg
from PIL import Image, ImageChops, ImageStat
from layout import Figure, Typography
from render import build, helix_points, solenoid, straight_wire

ROOT = Path(__file__).resolve().parents[1]
FAMILIES = ('straight-wire', 'solenoid', 'reactor-loop')


class RenderTests(unittest.TestCase):
    def test_reviewed_raster_regressions(self):
        for family in FAMILIES:
            with self.subTest(family=family):
                svg, report = build(json.loads((ROOT/'assets'/f'{family}.json').read_text()))
                image = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGB')
                reference = Image.open(ROOT/'references'/'verified'/f'{family}.png').convert('RGB')
                self.assertEqual(image.size, reference.size)
                delta = ImageChops.difference(image, reference)
                self.assertLess(max(ImageStat.Stat(delta).mean), .12, 'Reviewed layout or styling changed')
                # Both whole-image average and count of strongly changed pixels:
                # small arrow/label regressions must not disappear in whitespace.
                strong = delta.convert('L').point(lambda x: 255 if x > 32 else 0)
                self.assertLess(sum(strong.histogram()[1:])/(image.width*image.height), .0002)
                self.assertEqual(report['visualInspection'], 'required')

    def test_parameter_matrix(self):
        for turns in (4, 8, 12):
            for lines in (2, 5):
                for direction in ('up', 'down'):
                    for width in (900, 2400):
                        with self.subTest(turns=turns, lines=lines, direction=direction, width=width):
                            svg, _ = build(dict(family='solenoid', turns=turns, fieldLines=lines, direction=direction, width=width))
                            self.assertNotIn('NaN', svg)
        for direction in ('up', 'down'):
            for lines in range(2, 6):
                build(dict(family='straight-wire', direction=direction, fieldLines=lines, width=900))

    def test_long_labels_grow_canvas_without_shrinking_or_clipping(self):
        _, normal = build(dict(family='reactor-loop'))
        svg, report = build(dict(family='reactor-loop', labels={'exchanger': 'Heat exchanger ' * 35, 'condenser': 'W'*180}))
        self.assertGreater(len(report['labels']), len(normal['labels']))
        self.assertTrue(all(label['box'][0] >= 12 for label in report['labels']))
        self.assertNotIn('<text', svg)  # Outlined text cannot change metrics on another machine.

    def test_label_measurement_matches_outline(self):
        font = Typography()
        lines = font.wrap('W'*150 + ' primary secondary coolant', 21, 180)
        self.assertGreater(len(lines), 2)
        for line in lines:
            self.assertLessEqual(font.width(line, 21), 180)
            _, bounds = font.outline(line, 0, 30, 21)
            self.assertLessEqual(bounds[2]-bounds[0], 181)

    def test_audit_rejects_real_collisions(self):
        fig = Figure('test')
        fig.text('Primary', 100, 100)
        fig.text('Secondary', 100, 100)
        self.assertTrue(any('Overlapping text' in issue for issue in fig.audit()))
        with self.assertRaisesRegex(ValueError, 'Visual acceptance'):
            fig.svg(1200)
        fig = Figure('test')
        fig.text('Primary', 100, 100)
        fig.polyline([(90, 95), (230, 95)])
        self.assertTrue(any('Text over line' in issue for issue in fig.audit()))
        fig = Figure('test')
        fig.text('Outside', -50, 100)
        self.assertTrue(any('Clipped text' in issue for issue in fig.audit()))

    def test_unknown_or_unsafe_inputs_fail(self):
        for values in ({'family':'custom'}, {'width':899}, {'turns':13}, {'turns':True},
                       {'fieldLines':6}, {'direction':'left'}, {'position':[2,3]},
                       {'labels':{'coil':'\U0001f9f2'}}, {'labels':{'other':'unknown'}},
                       {'labels':{'coil':''}}, {'labels':{'coil':'x'*601}}, {'title':7}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                build(dict({'family':'solenoid'}, **values))
        with self.assertRaises(ValueError):
            build(dict(family='reactor-loop', direction='down'))

    def test_current_reversal_changes_actual_arrows_and_poles(self):
        for renderer, family in ((solenoid, 'solenoid'), (straight_wire, 'straight-wire')):
            arrows = []
            for direction in ('up', 'down'):
                fig = Figure('test')
                captured = []
                original = fig.arrow
                def capture(a, b, *args, **kwargs):
                    captured.append((a,b))
                    return original(a,b,*args,**kwargs)
                with patch.object(fig, 'arrow', capture):
                    renderer(fig, dict(family=family, direction=direction))
                arrows.append(captured)
                if family == 'solenoid':
                    pole = next(label for label in fig.labels if label['text'] == ('N' if direction=='up' else 'S'))
                    self.assertLess(pole['box'][1], 120)
            self.assertEqual(len(arrows[0]), len(arrows[1]))
            for up, down in zip(*arrows):
                self.assertEqual(up, (down[1], down[0]))

    def test_helix_is_continuous_and_has_positive_axial_circulation(self):
        for turns in (4, 12):
            points = helix_points(turns)
            self.assertAlmostEqual(points[0][1]-points[-1][1], 304)
            for a,b in zip(points, points[1:]):
                self.assertLess(math.dist(a,b), 5)
                # Y component of r cross dl = z*dx - x*dz.
                self.assertGreater(a[2]*(b[0]-a[0])-(a[0]-600)*(b[2]-a[2]), 0)

    def test_reactor_connections_and_circuit_separation(self):
        _, report = build(dict(family='reactor-loop'))
        data = report['semantics']
        self.assertEqual(data['primaryPath'][0], (280,339))  # Core outlet surface.
        self.assertEqual(data['primaryPath'][-1], (221,524))  # Core inlet surface.
        steam, exhaust, feed = data['secondaryPaths']
        self.assertEqual(steam[-1], (683,221))  # Turbine left inlet.
        self.assertEqual(exhaust[0], (705,280))  # On sloping turbine underside.
        self.assertEqual(exhaust[-1], (865,384))  # Condenser top.
        self.assertEqual(feed[0], (785,576))  # Condenser bottom.
        self.assertEqual(feed[-1], (433,522))  # Exchanger secondary inlet.
        endpoints = [tuple(p) for path in [data['primaryPath'], *data['secondaryPaths'], data['coolingPath']] for p in (path[0],path[-1])]
        self.assertEqual(len(endpoints), len(set(endpoints)), 'Separate fluid ports must not merge')

    def test_isolated_skill_cli_and_determinism(self):
        with tempfile.TemporaryDirectory() as tmp:
            isolated = Path(tmp)/'skill'
            shutil.copytree(ROOT, isolated, ignore=shutil.ignore_patterns('__pycache__'))
            output = Path(tmp)/'result.svg'
            result = subprocess.run([sys.executable, str(isolated/'scripts/render.py'), str(isolated/'assets/solenoid.json'), str(output)], cwd=tmp, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output.with_suffix('.png').exists())
            self.assertTrue(output.with_suffix('.report.json').exists())
            expected, _ = build(json.loads((ROOT/'assets/solenoid.json').read_text()))
            self.assertEqual(output.read_text(encoding='utf-8'), expected)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Measured, outlined typography and geometric acceptance for portable SVGs."""
from pathlib import Path
from html import escape
from math import hypot
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen


FONT = Path(__file__).resolve().parents[1] / "assets" / "OldStandard-Regular.ttf"


def intersects(a, b, gap=0):
    return (a[0] < b[2] + gap and b[0] < a[2] + gap
            and a[1] < b[3] + gap and b[1] < a[3] + gap)


def segment_hits_box(a, b, box):
    """Liang-Barsky clipping; includes stroke-expanded bounds."""
    lo, hi = 0.0, 1.0
    dx, dy = b[0] - a[0], b[1] - a[1]
    for p, q in ((-dx, a[0]-box[0]), (dx, box[2]-a[0]),
                 (-dy, a[1]-box[1]), (dy, box[3]-a[1])):
        if p == 0:
            if q < 0:
                return False
        elif p < 0:
            lo = max(lo, q / p)
        else:
            hi = min(hi, q / p)
    return lo <= hi


class Typography:
    def __init__(self):
        self.font = TTFont(FONT)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.units = self.font['head'].unitsPerEm

    def glyph_names(self, value):
        for char in value:
            if ord(char) not in self.cmap:
                raise ValueError(f"Unsupported font character U+{ord(char):04X}; use a supported label")
            yield self.cmap[ord(char)]

    def width(self, value, size):
        return sum(self.glyphs[name].width for name in self.glyph_names(value)) * size / self.units

    def wrap(self, value, size, width):
        if not isinstance(value, str) or not value.strip() or len(value) > 600:
            raise ValueError('Labels must contain 1–600 characters')
        lines, line = [], ''
        for word in value.split():
            candidate = (line + ' ' + word).strip()
            if self.width(candidate, size) <= width:
                line = candidate
                continue
            if line:
                lines.append(line)
            line = ''
            for char in word:
                if self.width(line + char, size) > width:
                    if not line:
                        raise ValueError('Label column too narrow')
                    lines.append(line)
                    line = ''
                line += char
        if line:
            lines.append(line)
        return lines

    def outline(self, value, x, baseline, size):
        paths, boxes = [], []
        scale = size / self.units
        for name in self.glyph_names(value):
            glyph = self.glyphs[name]
            pen = SVGPathPen(self.glyphs)
            glyph.draw(pen)
            bounds = BoundsPen(self.glyphs)
            glyph.draw(bounds)
            if bounds.bounds:
                x0, y0, x1, y1 = bounds.bounds
                boxes.append((x+x0*scale, baseline-y1*scale, x+x1*scale, baseline-y0*scale))
                paths.append(f'<path transform="translate({x:.4f} {baseline:.4f}) scale({scale:.7f} {-scale:.7f})" d="{pen.getCommands()}"/>')
            x += glyph.width * scale
        bbox = (min(b[0] for b in boxes), min(b[1] for b in boxes),
                max(b[2] for b in boxes), max(b[3] for b in boxes)) if boxes else (x, baseline, x, baseline)
        return ''.join(paths), bbox


class Figure:
    def __init__(self, title):
        self.type = Typography()
        self.parts, self.labels, self.segments, self.solids = [], [], [], []
        self.width, self.height = 1200, 800
        self.title = title
        self.notes = []

    def text(self, value, x, y, size=21, color='#263944', anchor='start', annotation=False):
        if anchor == 'middle':
            x -= self.type.width(value, size)/2
        path, box = self.type.outline(value, x, y, size)
        self.parts.append(f'<g fill="{color}" role="img" aria-label="{escape(value, quote=True)}">{path}</g>')
        self.labels.append({'text': value, 'box': box, 'annotation': annotation})

    def block(self, value, x, y, width, size=21, color='#263944'):
        lines = self.type.wrap(value, size, width)
        for i, line in enumerate(lines):
            self.text(line, x, y + i*size*1.35, size, color)
        return len(lines)*size*1.35

    def polyline(self, points, color='#347ca1', width=2, dashed=False, record=True):
        d = 'M ' + ' L '.join(f'{x:.3f} {y:.3f}' for x, y in points)
        dash = ' stroke-dasharray="6 5"' if dashed else ''
        self.parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"{dash}/>')
        if record:
            self.segments.extend((a, b, width) for a, b in zip(points, points[1:]))

    def arrow(self, a, b, color='#347ca1', width=2, head=10):
        self.polyline([a, b], color, width)
        dx, dy = b[0]-a[0], b[1]-a[1]
        length = hypot(dx, dy)
        if length < 1:
            raise ValueError('Degenerate arrow')
        ux, uy = dx/length, dy/length
        self.polyline([(b[0]-ux*head-uy*head/2, b[1]-uy*head+ux*head/2), b,
                       (b[0]-ux*head+uy*head/2, b[1]-uy*head-ux*head/2)], color, width)

    def rect(self, x, y, w, h, fill, radius=0, stroke='#718b95', record=True):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
        if record:
            self.solids.append((x, y, x+w, y+h))

    def badge(self, n, x, y):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="14" fill="white" stroke="#5b7481" stroke-width="1.3"/>')
        self.text(str(n), x, y+6, 18, anchor='middle', annotation=True)

    def legend(self, entries, overrides, y=740):
        unknown = set(overrides) - {key for key, _ in entries}
        if unknown:
            raise ValueError('Unknown label keys: ' + ', '.join(sorted(unknown)))
        for start in range(0, len(entries), 3):
            heights = []
            for col, (key, default) in enumerate(entries[start:start+3]):
                x = 50 + col*380
                self.badge(start+col+1, x+14, y-6)
                heights.append(self.block(overrides.get(key, default), x+38, y, 315))
            y += max(heights) + 26
        self.height = max(800, y+35)

    def audit(self):
        issues = []
        for i, label in enumerate(self.labels):
            box = label['box']
            if box[0] < 12 or box[1] < 12 or box[2] > self.width-12 or box[3] > self.height-12:
                issues.append('Clipped text: ' + label['text'])
            for other in self.labels[i+1:]:
                if intersects(box, other['box'], 2):
                    issues.append('Overlapping text: ' + label['text'] + ' / ' + other['text'])
            if label['annotation']:
                continue  # Explicit numbered callouts intentionally sit in white disks.
            if any(intersects(box, solid, 3) for solid in self.solids):
                issues.append('Text over body: ' + label['text'])
            for a, b, width in self.segments:
                expanded = (box[0]-width/2-2, box[1]-width/2-2, box[2]+width/2+2, box[3]+width/2+2)
                if segment_hits_box(a, b, expanded):
                    issues.append('Text over line: ' + label['text'])
                    break
        for a, b, width in self.segments:
            for x, y in (a, b):
                if not (width/2 <= x <= self.width-width/2 and width/2 <= y <= self.height-width/2):
                    issues.append('Clipped line')
        for box in self.solids:
            if box[0] < 1 or box[1] < 1 or box[2] >= self.width or box[3] >= self.height:
                issues.append('Clipped body')
        return sorted(set(issues))

    def svg(self, output_width):
        issues = self.audit()
        if issues:
            raise ValueError('Visual acceptance failed: ' + '; '.join(issues))
        defs = '''<defs>
<linearGradient id="metal" x2="0" y2="1"><stop stop-color="#dce7eb"/><stop offset=".35" stop-color="#f4f7f8"/><stop offset="1" stop-color="#6e919e"/></linearGradient>
<linearGradient id="water" x2="0" y2="1"><stop stop-color="#e8f8fb"/><stop offset="1" stop-color="#64c8dc"/></linearGradient>
<linearGradient id="hot" x2="1" y2="0"><stop stop-color="#e78335"/><stop offset=".45" stop-color="#ffd69b"/><stop offset="1" stop-color="#d9752e"/></linearGradient>
<linearGradient id="rod" x2="1" y2="0"><stop stop-color="#687e88"/><stop offset=".4" stop-color="#d6e0e4"/><stop offset="1" stop-color="#7c929b"/></linearGradient>
</defs>'''
        height = round(self.height*output_width/self.width)
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{output_width}" height="{height}" viewBox="0 0 {self.width} {self.height}" role="img"><title>{escape(self.title)}</title><desc>{escape(" ".join(self.notes))}</desc>{defs}<rect width="1200" height="{self.height}" fill="white"/>' + ''.join(self.parts) + '</svg>'

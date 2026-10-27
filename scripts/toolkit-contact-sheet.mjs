// Contact sheet of every toolkit part: one composition per category, each part
// sample in its own 4 x 3 world-unit cell with its type name underneath. The
// sheets are themselves compositions, so they pass the same overlap gate and
// style contract as any agent model. Writes docs/toolkit/contact-sheet/*.svg,
// renders the worked examples in examples/toolkit/parts/ to
// docs/toolkit/contact-sheet/examples/, and PNGs when a headless Chrome or Edge is available (dev-time only; set
// KINETRA_CHROME to its path to override).
// Run: npm run contact-sheet:toolkit
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compose, TOOLKIT_PART_CATALOG, TOOLKIT_PART_SAMPLES } from '../packages/core/src/toolkit/index.ts';

const outDir = resolve('docs/toolkit/contact-sheet');
mkdirSync(outDir, { recursive: true });
const COLS = 6, CW = 4, CH = 3.4, PX = 50;
const categories = ['general', 'mechanics', 'fields', 'fluids', 'circuits', 'logic', 'plots'];

/** Deterministic sample variation. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function sheetModel(category) {
  const parts = TOOLKIT_PART_CATALOG.filter(p => p.category === category && TOOLKIT_PART_SAMPLES.has(p.type));
  const rows = Math.ceil(parts.length / COLS);
  const elements = [];
  parts.forEach((p, k) => {
    const col = k % COLS, row = rows - 1 - Math.floor(k / COLS);
    const c = { x: col * CW + CW / 2, y: row * CH + CH / 2 + 0.2 };
    const id = p.type.replace(/[^A-Za-z0-9_]/g, '_');
    elements.push(...TOOLKIT_PART_SAMPLES.get(p.type)(id, c, rng(1000 + k)));
    elements.push({ id: `${id}__name`, type: 'text', text: p.type, size: 11, color: 'caption', at: { x: c.x, y: row * CH + 0.18 } });
  });
  return {
    canvas: { width: COLS * CW * PX, height: Math.round((rows * CH + 0.8) * PX), world: { xMin: 0, xMax: COLS * CW, yMin: 0, yMax: rows * CH + 0.8 } },
    title: `Kinetra toolkit parts: ${category}`,
    elements,
  };
}

function findChrome() {
  const c = [process.env.KINETRA_CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find(p => p && existsSync(p));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const chrome = findChrome();
  let failed = 0;
  for (const cat of categories) {
    if (!TOOLKIT_PART_CATALOG.some(p => p.category === cat)) continue;
    const m = sheetModel(cat);
    const r = compose(m);
    if (!r.ok) { failed++; console.error(`${cat}: ${r.errors.map(e => `${e.code} [${e.elements.join(',')}] ${e.message}`).join('\n  ')}`); continue; }
    const svgPath = resolve(outDir, `${cat}.svg`);
    writeFileSync(svgPath, r.svg);
    let png = '';
    if (chrome) {
      const pngPath = resolve(outDir, `${cat}.png`);
      const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${m.canvas.width},${m.canvas.height}`, `--screenshot=${pngPath}`, pathToFileURL(svgPath).href], { encoding: 'utf8' });
      png = res.status === 0 && existsSync(pngPath) ? ` + ${cat}.png` : ' (PNG failed)';
    }
    console.log(`${cat}: ${r.report.elements.length} elements -> ${cat}.svg${png}`);
  }
  const exIn = resolve('examples/toolkit/parts'), exOut = resolve(outDir, 'examples');
  mkdirSync(exOut, { recursive: true });
  for (const f of readdirSync(exIn).filter(n => n.endsWith('.json')).sort()) {
    const m = JSON.parse(readFileSync(resolve(exIn, f), 'utf8'));
    const r = compose(m);
    const base = f.replace(/\.json$/, '');
    if (!r.ok) { failed++; console.error(`example ${base}: ${r.errors.map(e => `${e.code} [${e.elements.join(',')}] ${e.message}`).join('\n  ')}`); continue; }
    const svgPath = resolve(exOut, `${base}.svg`);
    writeFileSync(svgPath, r.svg);
    if (chrome) spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${m.canvas.width},${m.canvas.height}`, `--screenshot=${resolve(exOut, `${base}.png`)}`, pathToFileURL(svgPath).href]);
    console.log(`example ${base}: ${r.report.checks.length} checks pass`);
  }
  process.exit(failed ? 1 : 0);
}

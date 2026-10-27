/**
 * Text measurement for Kinetra's label font ("Arial, Helvetica, sans-serif")
 * from hard-coded advance widths (1/1000 em; Arial and Helvetica share
 * metrics). Unknown characters are measured as a full em, so they can only
 * overestimate. Labels accept light markup that becomes Unicode:
 *   F_N -> F + subscript N, x^2 -> x + superscript 2, \theta -> θ,
 *   v_{max} -> v + subscript max.
 */
import { fail } from "./errors.js";

const ASCII: Record<string, number> = {
  " ": 278, "!": 278, "\"": 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, "_": 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
};
const EXTRA: Record<string, number> = {
  "α": 578, "β": 575, "γ": 500, "δ": 556, "ε": 446, "ζ": 441, "η": 556, "θ": 556, "ι": 222, "κ": 500, "λ": 500, "μ": 576, "ν": 500, "ξ": 446, "ο": 556, "π": 690, "ρ": 571, "σ": 618, "ς": 500, "τ": 395, "υ": 546, "φ": 648, "χ": 524, "ψ": 713, "ω": 781,
  "Γ": 551, "Δ": 668, "Θ": 778, "Λ": 667, "Ξ": 649, "Π": 722, "Σ": 618, "Υ": 667, "Φ": 798, "Ψ": 835, "Ω": 747,
  "°": 400, "·": 278, "×": 584, "÷": 584, "−": 584, "±": 584, "≈": 584, "≠": 584, "≤": 584, "≥": 584, "→": 1000, "←": 1000, "∞": 713, "√": 549, "∑": 713, "∫": 274, "∂": 494, "′": 191, "″": 355, "…": 1000, "µ": 556, "Å": 667,
};
const SUB = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜᵢⱼᵣᵤᵥᵦᵧᵨᵩᵪ";
const SUB_SRC = "0123456789+-=()aeoxəhklmnpstijruvβγρφχ";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ";
const SUP_SRC = "0123456789+-=()niabcdefghjklmoprstuvwxyzABDEGHIJKLMNOPRTUVW";
/** Sub/superscript glyphs come from fallback fonts; measured at 0.65 em, an upper bound. */
const SCRIPT_WIDTH = 650;

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω", deg: "°", cdot: "·", times: "×", pm: "±", approx: "≈", leq: "≤", geq: "≥", to: "→", infty: "∞", sqrt: "√",
};

const subMap = new Map([...SUB_SRC].map((c, i) => [c, [...SUB][i]!]));
const supMap = new Map([...SUP_SRC].map((c, i) => [c, [...SUP][i]!]));

/** Convert label markup to the Unicode string that is rendered. */
export function formatLabelText(src: string, owner: string[] = []): string {
  let s = src.replace(/\\([A-Za-z]+)/g, (m, name: string) => GREEK[name] ?? m);
  if (/\\[A-Za-z]/.test(s)) {
    const bad = s.match(/\\[A-Za-z]+/)![0];
    fail("E_TEXT_UNSUPPORTED", owner, `Unknown symbol ${bad} in label "${src}"`, { suggestion: `Use one of ${Object.keys(GREEK).slice(0, 12).map(k => "\\" + k).join(", ")}, ... or type the Unicode character.` });
  }
  s = s.replace(/([_^])(\{([^}]*)\}|(.))/gu, (m, kind: string, _g, group: string | undefined, single: string | undefined) => {
    const body = group ?? single ?? "";
    const map = kind === "_" ? subMap : supMap;
    const out = [...body].map(c => map.get(c));
    if (out.some(c => c === undefined)) {
      const missing = [...body].filter(c => !map.has(c)).join("");
      fail("E_TEXT_UNSUPPORTED", owner, `"${missing}" has no Unicode ${kind === "_" ? "subscript" : "superscript"} form in label "${src}"`, { suggestion: `${kind === "_" ? "Subscripts" : "Superscripts"} support ${[...(kind === "_" ? SUB_SRC : SUP_SRC)].join("")}; otherwise write the text inline, e.g. "F (normal)".` });
    }
    return out.join("");
  });
  return s;
}

export function charWidth(ch: string): number {
  const w = ASCII[ch] ?? EXTRA[ch];
  if (w !== undefined) return w;
  if (SUB.includes(ch) || SUP.includes(ch)) return SCRIPT_WIDTH;
  return 1000;
}

/** Advance width in px of rendered (already formatted) text at a font size. */
export function measureLabelWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w * size / 1000;
}

/** Vertical extent around the baseline (px): Arial ascent incl. accents, descent. */
export function labelVerticalExtent(size: number): { above: number; below: number } {
  return { above: size * 0.92, below: size * 0.22 };
}

/** Title metrics: Inter 600 is wider than Arial; a 1.15 factor bounds it. */
export function measureTitleWidth(text: string, size: number): number {
  return measureLabelWidth(text, size) * 1.15;
}

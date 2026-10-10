/**
 * Contrast of frontier's semantic colour tokens, worked out from the CSS rather than a browser. Shared by
 * tools/check-token-contrast.ts and its tests. Tokens come resolved from ./token-cascade.ts; `calc()` is
 * evaluated here and the `oklch()` converted to sRGB, clipped to gamut as Chromium paints it, for the WCAG 2
 * contrast ratio.
 */
import { CUBE, FLARE, LMS_TO_LINEAR_SRGB, LUMINANCE_WEIGHTS, OKLAB_TO_LMS, OKLCH_FULL_CHROMA } from './colour-space.ts';
import { resolveToken } from './token-cascade.ts';

function number(text: string): number {
  const value = Number(text);
  if (text.trim() === '' || Number.isNaN(value)) {
    throw new TypeError(`${text} is not a number`);
  }
  return value;
}

/**
 * Evaluates a `calc()` body of plain numbers joined by `* / + -`, without parentheses: all the tokens use.
 * CSS requires spaces around `+` and `-`, so they split terms; `*` and `/` bind tighter within a term.
 */
export function evaluateArithmetic(expression: string): number {
  const [first = '', ...rest] = expression.trim().split(/\s+(?<operator>[+-])\s+/u);
  let total = evaluateTerm(first);
  for (let index = 0; index < rest.length; index += 2) {
    const operand = evaluateTerm(rest[index + 1] ?? '');
    total = rest[index] === '+' ? total + operand : total - operand;
  }
  return total;
}

function evaluateTerm(text: string): number {
  const [head = '', ...factors] = text.split(/\s*(?<operator>[*/])\s*/u);
  let value = number(head);
  for (let index = 0; index < factors.length; index += 2) {
    const operand = number(factors[index + 1] ?? '');
    value = factors[index] === '*' ? value * operand : value / operand;
  }
  return value;
}

/** Linear-light sRGB channels, each 0–1. */
export interface LinearRgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

interface Oklch {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

const CALC = /calc\((?<expression>[^()]*)\)/gu;
const OKLCH = /^oklch\((?<body>[^()]*)\)$/u;
const PERCENT = 100;
const DEGREES_PER_HALF_TURN = 180;
const OKLCH_COMPONENTS = 3;

function component(text: string, hundredPercent: number): number {
  return text.endsWith('%') ? (number(text.slice(0, -1)) / PERCENT) * hundredPercent : number(text);
}

/** Reads an opaque `oklch(L C H)`. Anything else throws, so a new colour format fails the check, never passes it. */
function parseOklch(color: string): Oklch {
  const calculated = color
    .trim()
    .replaceAll(CALC, (_match, expression: string) => String(evaluateArithmetic(expression)));
  const body = OKLCH.exec(calculated)?.groups?.['body'];
  if (body === undefined) {
    throw new TypeError(`${color} is not an oklch() colour`);
  }
  const parts = body.trim().split(/\s+/u);
  const [lightness = '', chroma = '', hue = ''] = parts;
  if (parts.length !== OKLCH_COMPONENTS) {
    throw new TypeError(`${color} needs exactly L, C and H (no alpha)`);
  }
  return { lightness: component(lightness, 1), chroma: component(chroma, OKLCH_FULL_CHROMA), hue: number(hue) };
}

const clip = (value: number): number => Math.min(1, Math.max(0, value));

/** An opaque `oklch()` as linear sRGB, each channel clipped to gamut as Chromium paints it. */
export function oklchToLinearRgb(color: string): LinearRgb {
  const { lightness, chroma, hue } = parseOklch(color);
  const radians = (hue * Math.PI) / DEGREES_PER_HALF_TURN;
  const greenRed = chroma * Math.cos(radians);
  const blueYellow = chroma * Math.sin(radians);
  const cones = OKLAB_TO_LMS.map(([fromA, fromB]) => (lightness + fromA * greenRed + fromB * blueYellow) ** CUBE);
  const [red = 0, green = 0, blue = 0] = LMS_TO_LINEAR_SRGB.map((row) =>
    clip(row.reduce((sum, weight, index) => sum + weight * (cones[index] ?? 0), 0)),
  );
  return { red, green, blue };
}

/** WCAG 2 relative luminance. */
export function relativeLuminance({ red, green, blue }: LinearRgb): number {
  const [redWeight, greenWeight, blueWeight] = LUMINANCE_WEIGHTS;
  return redWeight * red + greenWeight * green + blueWeight * blue;
}

/** WCAG 2 contrast ratio, 1 to 21. */
export function contrastRatio(first: LinearRgb, second: LinearRgb): number {
  const [lighter = 0, darker = 0] = [relativeLuminance(first), relativeLuminance(second)].toSorted(
    (left, right) => right - left,
  );
  return (lighter + FLARE) / (darker + FLARE);
}

export interface PairSpec {
  readonly foreground: readonly string[];
  readonly background: readonly string[];
  readonly minimum: number;
}

export interface PairResult {
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  readonly minimum: number;
}

/** Every foreground × background of every pair under one set of tokens; names are `--fr-` tokens unprefixed. */
export function measurePairs(tokens: ReadonlyMap<string, string>, pairs: readonly PairSpec[]): PairResult[] {
  const colour = (name: string): LinearRgb => oklchToLinearRgb(resolveToken(tokens, `--fr-${name}`));
  return pairs.flatMap(({ foreground, background, minimum }) =>
    foreground.flatMap((fg) =>
      background.map((bg) => ({
        foreground: fg,
        background: bg,
        ratio: contrastRatio(colour(fg), colour(bg)),
        minimum,
      })),
    ),
  );
}

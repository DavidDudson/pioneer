/**
 * Contrast of frontier's semantic colour tokens, worked out from the CSS rather than a browser. Shared by
 * tools/check-token-contrast.ts and its tests.
 *
 * Tokens live in `:root` rules that are narrowed only by `[data-theme=…]` / `[data-mode=…]` attributes
 * (and `:not(…)` of them), so a theme × mode is a set of attributes on `<html>`. Matching rules apply in
 * cascade order (specificity, then source order), `var()` and `calc()` are resolved, and the resulting
 * `oklch()` is converted to sRGB, clipped to gamut as Chromium paints it, for the WCAG 2 contrast ratio.
 */
import { parse } from 'postcss';

/** Custom properties set by one `:root…` rule. */
export interface TokenRule {
  readonly conditions: readonly AttributeCondition[];
  readonly specificity: number;
  readonly declarations: ReadonlyMap<string, string>;
}

export interface AttributeCondition {
  readonly name: string;
  readonly value: string;
  readonly negated: boolean;
}

export type Attributes = Readonly<Record<string, string>>;

const ROOT = ':root';
const CONDITION = /(?<not>:not\()?\[(?<name>[\w-]+)=['"]?(?<value>[\w-]+)['"]?\]\)?/gu;

/** The attribute conditions of `:root[…]:not([…])`, or undefined for any other selector. */
function parseRootSelector(selector: string): readonly AttributeCondition[] | undefined {
  const compact = selector.replaceAll(/\s/gu, '');
  if (!compact.startsWith(ROOT)) {
    return undefined;
  }
  const rest = compact.slice(ROOT.length);
  const found = [...rest.matchAll(CONDITION)];
  if (found.map(([whole]) => whole).join('') !== rest) {
    return undefined;
  }
  return found.map(({ groups }) => ({
    name: groups?.['name'] ?? '',
    value: groups?.['value'] ?? '',
    negated: groups?.['not'] !== undefined,
  }));
}

/**
 * The `:root…` rules of each stylesheet, in order. Rules inside at-rules (`@media`, `@theme`) and rules on
 * any other selector are not tokens and are skipped.
 */
export function parseTokenRules(stylesheets: readonly string[]): TokenRule[] {
  return stylesheets.flatMap((css) => {
    const rules: TokenRule[] = [];
    parse(css).each((node) => {
      if (node.type !== 'rule') {
        return;
      }
      const declarations = new Map<string, string>();
      node.walkDecls(/^--/u, (declaration) => {
        declarations.set(declaration.prop, declaration.value);
      });
      for (const conditions of node.selectors.map(parseRootSelector)) {
        if (conditions !== undefined) {
          rules.push({ conditions, specificity: 1 + conditions.length, declarations });
        }
      }
    });
    return rules;
  });
}

function matches(rule: TokenRule, attributes: Attributes): boolean {
  return rule.conditions.every(({ name, value, negated }) => (attributes[name] === value) !== negated);
}

/** The custom properties `<html>` ends up with for these attributes. */
export function cascade(rules: readonly TokenRule[], attributes: Attributes): ReadonlyMap<string, string> {
  const applied = rules
    .map((rule, order) => ({ rule, order }))
    .filter(({ rule }) => matches(rule, attributes))
    .toSorted((first, second) => first.rule.specificity - second.rule.specificity || first.order - second.order);
  const tokens = new Map<string, string>();
  for (const { rule } of applied) {
    for (const [name, value] of rule.declarations) {
      tokens.set(name, value);
    }
  }
  return tokens;
}

const VAR_REFERENCE = /var\((?<inner>[^()]*)\)/u;

/** A token's value with every `var()` substituted. Throws on an undefined token or a cycle. */
export function resolveToken(tokens: ReadonlyMap<string, string>, name: string, seen: readonly string[] = []): string {
  if (seen.includes(name)) {
    throw new Error(`${[...seen, name].join(' -> ')} is a cycle`);
  }
  const raw = tokens.get(name);
  if (raw === undefined) {
    throw new Error(`${name} is not defined`);
  }
  return substituteReferences(tokens, raw, [...seen, name]);
}

function substituteReferences(tokens: ReadonlyMap<string, string>, value: string, seen: readonly string[]): string {
  const reference = VAR_REFERENCE.exec(value);
  if (reference === null) {
    return value;
  }
  const inner = reference.groups?.['inner'] ?? '';
  const comma = inner.indexOf(',');
  const referenced = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const replacement =
    tokens.has(referenced) || comma === -1 ? resolveToken(tokens, referenced, seen) : inner.slice(comma + 1).trim();
  return substituteReferences(tokens, value.replace(reference[0], replacement), seen);
}

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
const PERCENT_OF_CHROMA = 0.4;
const DEGREES_PER_HALF_TURN = 180;

function component(text: string, hundredPercent: number): number {
  return text.endsWith('%') ? (number(text.slice(0, -1)) / 100) * hundredPercent : number(text);
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
  if (parts.length !== 3) {
    throw new TypeError(`${color} needs exactly L, C and H (no alpha)`);
  }
  return { lightness: component(lightness, 1), chroma: component(chroma, PERCENT_OF_CHROMA), hue: number(hue) };
}

// OKLab to LMS and LMS to linear sRGB: Björn Ottosson's matrices, as in CSS Color 4.
const OKLAB_TO_LMS = [
  [0.3963377774, 0.2158037573],
  [-0.1055613458, -0.0638541728],
  [-0.0894841775, -1.291485548],
] as const;
const LMS_TO_LINEAR_SRGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
] as const;

const clip = (value: number): number => Math.min(1, Math.max(0, value));

/** An opaque `oklch()` as linear sRGB, each channel clipped to gamut as Chromium paints it. */
export function oklchToLinearRgb(color: string): LinearRgb {
  const { lightness, chroma, hue } = parseOklch(color);
  const radians = (hue * Math.PI) / DEGREES_PER_HALF_TURN;
  const greenRed = chroma * Math.cos(radians);
  const blueYellow = chroma * Math.sin(radians);
  const cones = OKLAB_TO_LMS.map(([fromA, fromB]) => (lightness + fromA * greenRed + fromB * blueYellow) ** 3);
  const [red = 0, green = 0, blue = 0] = LMS_TO_LINEAR_SRGB.map((row) =>
    clip(row.reduce((sum, weight, index) => sum + weight * (cones[index] ?? 0), 0)),
  );
  return { red, green, blue };
}

/** WCAG 2 relative luminance. */
export function relativeLuminance({ red, green, blue }: LinearRgb): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2's allowance for viewing flare, added to both luminances. */
const FLARE = 0.05;

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

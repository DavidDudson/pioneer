/**
 * Frontier's token CSS as the browser cascades it onto `<html>`, for tools/token-contrast.ts.
 *
 * Tokens live in `:root` rules that are narrowed only by `[data-theme=…]` / `[data-mode=…]` attributes
 * (and `:not(…)` of them), so a theme × mode is a set of attributes on `<html>`. Matching rules apply in
 * cascade order (specificity, then source order) and `var()` references are substituted.
 */
import { parse } from 'postcss';
import type { Rule } from 'postcss';

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
  const compact = selector.trim();
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

const TOKEN_PREFIX = '--fr-';

/** The custom properties a rule sets itself, not those of rules nested in it. */
function ownDeclarations(rule: Rule): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const node of rule.nodes) {
    if (node.type === 'decl' && node.prop.startsWith('--')) {
      declarations.set(node.prop, node.value);
    }
  }
  return declarations;
}

/** One rule's token rules, or none when it sets no custom properties. */
function tokenRulesOf(rule: Rule): TokenRule[] {
  const declarations = ownDeclarations(rule);
  if (declarations.size === 0) {
    return [];
  }
  const nested = rule.parent?.type !== 'root';
  const conditionSets = rule.selectors.map(parseRootSelector);
  const setsTokens = [...declarations.keys()].some((name) => name.startsWith(TOKEN_PREFIX));
  if (setsTokens && (nested || conditionSets.includes(undefined))) {
    throw new Error(
      `${rule.selector} sets ${TOKEN_PREFIX}* tokens, but tokens may only be set in top-level ` +
        `:root[data-…]:not([data-…]) rules, which this check can read`,
    );
  }
  return conditionSets
    .filter((conditions) => conditions !== undefined)
    .map((conditions) => ({ conditions, specificity: 1 + conditions.length, declarations }));
}

/**
 * The `:root…` rules of each stylesheet, in order. A rule that sets `--fr-*` tokens anywhere else (another
 * selector, a combinator, nesting, inside `@media` or `@layer`) throws: skipping it would let the check
 * measure tokens the browser never uses.
 */
export function parseTokenRules(stylesheets: readonly string[]): TokenRule[] {
  return stylesheets.flatMap((css) => {
    const rules: TokenRule[] = [];
    parse(css).walkRules((rule) => {
      rules.push(...tokenRulesOf(rule));
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

const VAR_OPEN = 'var(';

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

interface VarReference {
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly fallback: string | undefined;
}

/** The first (outermost) `var()` in a value, split at its first top-level comma. */
function findVarReference(value: string): VarReference | undefined {
  const start = value.indexOf(VAR_OPEN);
  if (start === -1) {
    return undefined;
  }
  const bodyStart = start + VAR_OPEN.length;
  const { close, comma } = scanArguments(value, bodyStart);
  return {
    start,
    end: close + 1,
    name: value.slice(bodyStart, comma ?? close).trim(),
    fallback: comma === undefined ? undefined : value.slice(comma + 1, close).trim(),
  };
}

interface ArgumentScan {
  readonly close: number;
  readonly comma: number | undefined;
}

/** From just inside a function's `(`: where its `)` is and where its first top-level comma is, if any. */
function scanArguments(value: string, from: number): ArgumentScan {
  let depth = 1;
  let comma: number | undefined = undefined;
  for (let index = from; index < value.length; index += 1) {
    const character = value[index];
    depth += character === '(' ? 1 : 0;
    depth -= character === ')' ? 1 : 0;
    if (depth === 0) {
      return { close: index, comma };
    }
    comma ??= character === ',' && depth === 1 ? index : undefined;
  }
  throw new Error(`${value} has an unclosed function`);
}

/** Substitutes each `var()`; a fallback is read only when its token is undefined, as in CSS. */
function substituteReferences(tokens: ReadonlyMap<string, string>, value: string, seen: readonly string[]): string {
  const reference = findVarReference(value);
  if (reference === undefined) {
    return value;
  }
  const { start, end, name, fallback } = reference;
  const replacement =
    tokens.has(name) || fallback === undefined
      ? resolveToken(tokens, name, seen)
      : substituteReferences(tokens, fallback, seen);
  return substituteReferences(tokens, value.slice(0, start) + replacement + value.slice(end), seen);
}

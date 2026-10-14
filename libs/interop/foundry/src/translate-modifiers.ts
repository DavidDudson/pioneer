import { RuleElementKey } from '@pioneer/rules/sdk';

import { SKILLS } from './foundry-skills';

/**
 * Foundry's `FlatModifier` and `AdjustModifier`, and the predicate every element carries, in Pioneer's spelling (ADR-0008): `selector`
 * becomes `selectors` in Pioneer's vocabulary, an unnamespaced roll option gets one, an omitted `type` is `untyped`,
 * and fields that only steer Foundry's UI are dropped. What this cannot carry over (`removeAfterRoll`,
 * `requiresEquipped`, a damage category, a selector built from the item's id) is left as it is, so the element fails
 * and is kept for the backlog.
 */

/** The namespace of a roll option Foundry writes bare: an item's toggle (`expanded-buckler`) or a trait (`poison`). */
const BARE_OPTION_NAMESPACE = 'option';
const SEPARATOR = ':';

const SAVES: ReadonlySet<string> = new Set(['fortitude', 'reflex', 'will']);

/** Foundry's `FlatModifier` fields that only decide whether its line shows, with no effect on the number. */
const DISPLAY_ONLY_FIELDS: ReadonlySet<string> = new Set(['hideIfDisabled']);

const COMPARISONS: ReadonlySet<string> = new Set(['eq', 'gt', 'gte', 'lt', 'lte']);

/** A comparison's operands: the option, then the number or option it is compared with. */
function isOperands(operand: unknown): operand is [string, ...unknown[]] {
  return Array.isArray(operand) && typeof operand[0] === 'string';
}

function namespaced(option: string): string {
  return option.includes(SEPARATOR) ? option : `${BARE_OPTION_NAMESPACE}${SEPARATOR}${option}`;
}

/** A predicate statement with each bare roll option given a namespace; anything it does not recognise is as it was. */
function namespacedStatement(statement: unknown): unknown {
  if (typeof statement === 'string') {
    return namespaced(statement);
  }
  if (typeof statement !== 'object' || statement === null || Array.isArray(statement)) {
    return statement;
  }
  return Object.fromEntries(
    Object.entries(statement).map(([operator, operand]) => {
      if (COMPARISONS.has(operator) && isOperands(operand)) {
        const [option, ...rest] = operand;
        return [operator, [namespaced(option), ...rest]];
      }
      return [
        operator,
        Array.isArray(operand)
          ? operand.map((each: unknown) => namespacedStatement(each))
          : namespacedStatement(operand),
      ];
    }),
  );
}

/** `raw` with each bare roll option in its predicate given a namespace, as every element reads one. */
export function withNamespacedOptions(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('predicate' in raw) || !Array.isArray(raw.predicate)) {
    return raw;
  }
  return { ...raw, predicate: raw.predicate.map(namespacedStatement) };
}

/** A Foundry selector in Pioneer's: a skill or a save by its statistic, any other (a domain, `ac`) as it is. */
function selectorOf(selector: string): string {
  if (SKILLS.has(selector)) {
    return `skill${SEPARATOR}${selector}`;
  }
  return SAVES.has(selector) ? `save${SEPARATOR}${selector}` : selector;
}

function selectorsOf(selector: unknown): readonly string[] | undefined {
  if (typeof selector === 'string') {
    return [selectorOf(selector)];
  }
  const isList = Array.isArray(selector) && selector.every((each): each is string => typeof each === 'string');
  return isList ? selector.map((each) => selectorOf(each)) : undefined;
}

/** The elements that name what they reach by `selector`, which Pioneer spells `selectors`. */
const SELECTOR_KEYS: ReadonlySet<string> = new Set([RuleElementKey.FlatModifier, RuleElementKey.AdjustModifier]);

/**
 * A `FlatModifier` or `AdjustModifier` as Pioneer's element; any other element, or a selector that is not text, as it
 * is. A `FlatModifier` also defaults to `untyped`, as Foundry does, and drops the fields that only steer its display.
 */
export function withModifierSelectors(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || typeof raw.key !== 'string') {
    return raw;
  }
  const selectors = SELECTOR_KEYS.has(raw.key) && 'selector' in raw ? selectorsOf(raw.selector) : undefined;
  if (selectors === undefined) {
    return raw;
  }
  const flat = raw.key === RuleElementKey.FlatModifier;
  const kept = Object.entries(raw).filter(
    ([field]) => field !== 'selector' && !(flat && DISPLAY_ONLY_FIELDS.has(field)),
  );
  return { ...(flat ? { type: 'untyped' } : {}), ...Object.fromEntries(kept), selectors };
}

import { RuleElementKey } from '@pioneer/rules/sdk';

import { fromFoundryFormula } from './foundry-formula';
import { SKILLS } from './foundry-skills';

/**
 * Foundry's `FlatModifier`, `AdjustModifier`, `DamageDice` and `Note`, and the predicate every element carries, in
 * Pioneer's spelling (ADR-0008): `selector`
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

/** A roll option in a namespace: as it is when it names one, else under `option`. */
export function namespaced(option: string): string {
  return option.includes(SEPARATOR) ? option : `${BARE_OPTION_NAMESPACE}${SEPARATOR}${option}`;
}

/** A predicate statement with each bare roll option given a namespace; anything it does not recognise is as it was. */
export function namespacedStatement(statement: unknown): unknown {
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
export function selectorOf(selector: string): string {
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
const SELECTOR_KEYS: ReadonlySet<string> = new Set([
  RuleElementKey.FlatModifier,
  RuleElementKey.AdjustModifier,
  RuleElementKey.DamageDice,
  RuleElementKey.Note,
  RuleElementKey.AdjustDegreeOfSuccess,
  RuleElementKey.RollTwice,
  RuleElementKey.SubstituteRoll,
]);

/** The elements that drop `hideIfDisabled`: it only decides whether their line shows. */
const HIDEABLE_KEYS: ReadonlySet<string> = new Set([RuleElementKey.FlatModifier, RuleElementKey.DamageDice]);

/**
 * A `FlatModifier` or `AdjustModifier` as Pioneer's element; any other element, or a selector that is not text, as it
 * is. A `FlatModifier` also defaults to `untyped`, as Foundry does, and drops the fields that only steer its display.
 */
function withSelectors(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || typeof raw.key !== 'string') {
    return raw;
  }
  const selectors = SELECTOR_KEYS.has(raw.key) && 'selector' in raw ? selectorsOf(raw.selector) : undefined;
  if (selectors === undefined) {
    return raw;
  }
  const flat = raw.key === RuleElementKey.FlatModifier;
  const hideable = HIDEABLE_KEYS.has(raw.key);
  const kept = Object.entries(raw).filter(
    ([field]) => field !== 'selector' && !(hideable && DISPLAY_ONLY_FIELDS.has(field)),
  );
  return { ...(flat ? { type: 'untyped' } : {}), ...Object.fromEntries(kept), selectors };
}

/** A modifier-like element with its `selector` as `selectors`, and a check-shaping one with its fields renamed too. */
export function withModifierSelectors(raw: unknown): unknown {
  return withSelectors(withRollFields(raw));
}

/**
 * A `DamageDice` with a formula `diceNumber` in Pioneer's reference spelling; any other element as it is. A selector
 * built from the item (`{item|id}-damage`), a damage type or dice read from a pick, and a formula Pioneer cannot read
 * are left as they are, so the element fails and is kept for the backlog.
 */
export function withDiceFormula(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.DamageDice) {
    return raw;
  }
  if (!('diceNumber' in raw) || typeof raw.diceNumber !== 'string') {
    return raw;
  }
  return { ...raw, diceNumber: fromFoundryFormula(raw.diceNumber) };
}

const BASE_SPEED_KEY = 'BaseSpeed';

/** The movement types Foundry names in a `BaseSpeed` selector; a selector built from the item is none of them. */
const MOVEMENT_TYPES: ReadonlySet<string> = new Set(['land', 'burrow', 'climb', 'fly', 'swim']);

/**
 * A Foundry `BaseSpeed` as a `Change` that upgrades the `speed:<type>` statistic, keeping its base fields: it raises a
 * movement speed to its value, and never lowers one. A selector that is no movement type (one built from a pick) is
 * left as it is, so the element fails and is kept for the backlog; any other element as it is.
 */
export function withBaseSpeed(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== BASE_SPEED_KEY) {
    return raw;
  }
  if (!('selector' in raw) || typeof raw.selector !== 'string' || !MOVEMENT_TYPES.has(raw.selector)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => field !== 'key' && field !== 'selector');
  return {
    ...Object.fromEntries(rest),
    key: RuleElementKey.Change,
    selector: `speed${SEPARATOR}${raw.selector}`,
    mode: 'upgrade',
  };
}

const CREATURE_SIZE_KEY = 'CreatureSize';

/** Foundry's size codes in Pioneer's names (`size.ts`); `tiny` and `huge` are spelled the same. */
const SIZES: ReadonlyMap<string, string> = new Map([
  ['tiny', 'tiny'],
  ['sm', 'small'],
  ['med', 'medium'],
  ['lg', 'large'],
  ['huge', 'huge'],
  ['grg', 'gargantuan'],
]);

/** A size field of Foundry's: a code in Pioneer's name, a number of steps as it is, any other (a pick) as it is. */
export function sizeOf(size: unknown): unknown {
  return typeof size === 'string' ? (SIZES.get(size) ?? size) : size;
}

/**
 * A `CreatureSize` with its `value` and `maximumSize` in Pioneer's size names; any other element as it is. A size read
 * from a pick (`{item|flags.system.rulesSelections.enlarge.size}`) stays as written, so the element fails and is kept
 * for the backlog.
 */
export function withCreatureSize(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== CREATURE_SIZE_KEY) {
    return raw;
  }
  const sized = Object.entries(raw).map(([field, value]) => [
    field,
    field === 'value' || field === 'maximumSize' ? sizeOf(value) : value,
  ]);
  return Object.fromEntries(sized);
}

/** The check-shaping elements, which read a `selector` as `selectors` and share `type` and `removeAfterRoll`. */
const ROLL_KEYS: ReadonlySet<string> = new Set([
  RuleElementKey.AdjustDegreeOfSuccess,
  RuleElementKey.RollTwice,
  RuleElementKey.SubstituteRoll,
]);

/**
 * An `AdjustDegreeOfSuccess`, `RollTwice` or `SubstituteRoll` with Foundry's `type` as `checkType`, and a
 * `removeAfterRoll: false`, which is Foundry's default, dropped. `removeAfterRoll: true` (an effect spent by the roll)
 * stays, so the element fails and is kept for the backlog; any other element as it is.
 */
function withRollFields(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || typeof raw.key !== 'string') {
    return raw;
  }
  if (!ROLL_KEYS.has(raw.key)) {
    return raw;
  }
  const renamed = Object.entries(raw)
    .filter(([field, value]) => !(field === 'removeAfterRoll' && value === false))
    .map(([field, value]) => [field === 'type' ? 'checkType' : field, value]);
  return Object.fromEntries(renamed);
}

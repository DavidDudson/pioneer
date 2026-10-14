import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { readsOnlyItem } from './translate-item-alterations';

const ADJUST_STRIKE_KEY = 'AdjustStrike';

/** Foundry's damage for a `Strike` of its own: `{ base: { damageType, die, dice } }`, `dice` defaulting to 1. */
const FoundryStrikeDamage = z.strictObject({
  base: z.strictObject({
    damageType: z.string(),
    die: z.string().optional(),
    dice: z.number().int().nonnegative().optional(),
  }),
});

/**
 * A `Strike` that defines an attack of its own (claws, jaws), with its damage as Pioneer reads it: Foundry's
 * `damage.base` read out into `damage`, `dice` set to 1 when Foundry leaves it out. Its other fields (`slug`,
 * `category`, `group`, `range`, `traits`, the base `label`) are the same in both. The fist form, and a `Strike`
 * whose damage is shaped any other way (a `replaceAll`, a second damage part), is left as it is, so the element
 * fails and is kept for the backlog.
 */
function withStrikeDamage(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Strike) {
    return raw;
  }
  const damage = 'damage' in raw ? FoundryStrikeDamage.safeParse(raw.damage) : undefined;
  if (damage === undefined || !damage.success) {
    return raw;
  }
  const { base } = damage.data;
  const { damageType, die, dice = 1 } = base;
  return { ...raw, damage: { dice, ...(die === undefined ? {} : { die }), damageType } };
}

/** Foundry's `Strike` fields Pioneer has no use for: `baseType` only names the weapon the attack imitates. */
const STRIKE_FIELDS_DROPPED: ReadonlySet<string> = new Set(['baseType']);

/** A `Strike`'s `range`: Foundry's `{ increment }` is Pioneer's number, and `null` (a melee attack) is no range. */
/** The `range` of a Strike element: the number, or nothing for a melee attack. */
interface StrikeRange {
  readonly range?: unknown;
}

function strikeRange(range: unknown): StrikeRange {
  if (typeof range === 'object' && range !== null && 'increment' in range) {
    return { range: range.increment };
  }
  return range === null ? {} : { range };
}

/**
 * A `Strike` that defines an attack of its own with Foundry's `baseType` and `range` in Pioneer's spelling: `baseType`
 * is dropped, an attack with no `slug` is named by its `baseType` as Foundry names it, and `range` is its increment
 * (`null`, a melee attack, is none). Any other element as it is; one with no `baseType` to name it stays without a
 * `slug`, so it fails and is kept for the backlog.
 */
function withStrikeFields(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Strike) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => field !== 'range' && !STRIKE_FIELDS_DROPPED.has(field));
  const named = 'slug' in raw || !('baseType' in raw) ? {} : { slug: raw.baseType };
  return { ...named, ...Object.fromEntries(kept), ...('range' in raw ? strikeRange(raw.range) : {}) };
}

/** The numeric properties of a weapon `AdjustStrike` changes, and the ones it adds or removes a slug of. */
const STRIKE_PROPERTIES: ReadonlySet<string> = new Set(['traits', 'materials', 'property-runes', 'range-increment']);

/** Whether `definition` is a predicate about the weapon alone, as `items` is. */
function isItemPredicate(definition: unknown): definition is readonly unknown[] {
  return Array.isArray(definition) && definition.length > 0 && definition.every((each) => readsOnlyItem(each));
}

/**
 * A Foundry `AdjustStrike` as an `ItemAlteration` of the weapons its `definition` reaches, keeping its mode, value and
 * predicate: Foundry adds a trait, material or property rune to a weapon, or changes its range increment. One with no
 * `definition`, one reaching Strikes by `selectors`, and a property Pioneer does not alter are left as they are, so the
 * element fails and is kept for the backlog; any other element as it is.
 */
function withStrikeAlteration(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== ADJUST_STRIKE_KEY) {
    return raw;
  }
  const reachable = 'definition' in raw && isItemPredicate(raw.definition) && !('selectors' in raw);
  if (!reachable || !('property' in raw) || typeof raw.property !== 'string' || !STRIKE_PROPERTIES.has(raw.property)) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => field !== 'key' && field !== 'definition');
  return { ...Object.fromEntries(kept), key: RuleElementKey.ItemAlteration, items: raw.definition };
}

/** Both forms of a Foundry `Strike` or `AdjustStrike`, as Pioneer's elements. */
export function withStrike(raw: unknown): unknown {
  return withStrikeAlteration(withStrikeFields(withStrikeDamage(raw)));
}

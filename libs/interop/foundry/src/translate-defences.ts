import { DamageGroup, RuleElementKey } from '@pioneer/rules/sdk';

/**
 * Foundry's `Resistance`, `Weakness` and `Immunity` in Pioneer's spelling (ADR-0008): `type` is a list, and
 * Foundry's `all-damage` is the `all` group. A `value` formula is read as for any element, and `exceptions` and a
 * predicate stand. What this cannot carry over (a type picked by a `ChoiceSet`, a `custom` type with its own
 * `definition`, a type that is a damage trait such as `holy` or `silver`, `doubleVs`, `mode`, and the `exceptions` of
 * an `Immunity`) is left as it is, so the element fails and is kept for the backlog.
 */

const DEFENCE_KEYS: ReadonlySet<string> = new Set([
  RuleElementKey.Resistance,
  RuleElementKey.Weakness,
  RuleElementKey.Immunity,
]);

/** Foundry's name for every kind of damage, which Pioneer calls the `all` group. */
const ALL_DAMAGE = 'all-damage';

function typeOf(type: unknown): unknown {
  return type === ALL_DAMAGE ? DamageGroup.All : type;
}

/**
 * A `Resistance`, `Weakness` or `Immunity` with its `type` a list of Pioneer's types; any other element, or a `type`
 * that is neither text nor a list, as it is.
 */
export function withDefenceTypes(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || typeof raw.key !== 'string') {
    return raw;
  }
  if (!DEFENCE_KEYS.has(raw.key) || !('type' in raw)) {
    return raw;
  }
  const { type } = raw;
  if (typeof type === 'string') {
    return { ...raw, type: [typeOf(type)] };
  }
  return Array.isArray(type) ? { ...raw, type: type.map((each: unknown) => typeOf(each)) } : raw;
}

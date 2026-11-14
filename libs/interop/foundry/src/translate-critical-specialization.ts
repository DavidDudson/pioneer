import { RuleElementKey } from '@pioneer/rules/sdk';

import type { NoteContext } from './translate-notes';
import { richTextOf } from './translate-notes';

/**
 * Foundry's `CriticalSpecialization` in Pioneer's spelling (ADR-0008). A weapon's own rule that names the weapon by
 * its own id (`item:id:{item|_id}`) reaches only that weapon, which is what `etched` says; the statement goes. An
 * `alternate` one carries its words as `text`, read as a `Note`'s is, and its `damageDice`
 * (`{ category: 'persistent', damageType, faces, number }`) as the persistent damage `1d6` of a type. A `damageDice`
 * of any other shape is left as it is, so the element fails and is kept for the backlog.
 */

/** A weapon's read of its own id: the weapon the rule belongs to. */
const OWN_WEAPON = 'item:id:{item|_id}';

function isSpecialization(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && 'key' in raw && raw.key === RuleElementKey.CriticalSpecialization;
}

/** A `CriticalSpecialization` that names its own weapon as one that is `etched` onto it; any other element as it is. */
function withOwnWeapon(raw: unknown): unknown {
  if (!isSpecialization(raw) || !Array.isArray(raw['predicate']) || !raw['predicate'].includes(OWN_WEAPON)) {
    return raw;
  }
  const rest = Object.fromEntries(Object.entries(raw).filter(([field]) => field !== 'predicate'));
  const kept = raw['predicate'].filter((statement: unknown) => statement !== OWN_WEAPON);
  return { ...rest, etched: true, ...(kept.length === 0 ? {} : { predicate: kept }) };
}

/** Foundry's persistent damage dice as a formula and a type; anything else as it is. */
function persistentOf(dice: unknown): unknown {
  if (typeof dice !== 'object' || dice === null) {
    return dice;
  }
  const { category, damageType, faces, number } = 'category' in dice ? Object.fromEntries(Object.entries(dice)) : {};
  const valid = category === 'persistent' && typeof damageType === 'string';
  return valid && typeof faces === 'number' && typeof number === 'number'
    ? { formula: `${number}d${faces}`, damageType }
    : dice;
}

/** A `CriticalSpecialization` as Pioneer spells it; any other element as it is. */
export function withSpecialization(shaped: unknown, context: NoteContext): unknown {
  const raw = withOwnWeapon(shaped);
  if (!isSpecialization(raw)) {
    return raw;
  }
  return {
    ...raw,
    ...('text' in raw ? { text: richTextOf(raw['text'], context) } : {}),
    ...('damageDice' in raw ? { damageDice: persistentOf(raw['damageDice']) } : {}),
  };
}

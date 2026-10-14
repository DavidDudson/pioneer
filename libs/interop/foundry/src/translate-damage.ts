import { RuleElementKey } from '@pioneer/rules/sdk';

import { fromFoundryFormula } from './foundry-formula';

/**
 * Foundry's `DamageDice` in Pioneer's spelling (ADR-0008): `selector` is `selectors` and `hideIfDisabled` is dropped
 * (`translate-modifiers.ts`), and a `diceNumber` that is a formula is read in Pioneer's reference spelling. A
 * `DamageAlteration` already has Pioneer's shape. What this cannot carry over (a selector built from the item,
 * `{item|id}-damage`, a damage type or dice read from a pick, a formula Pioneer cannot read) is left as it is, so the
 * element fails and is kept for the backlog.
 */

/** A `DamageDice` with a formula `diceNumber` in Pioneer's spelling; any other element as it is. */
export function withDiceFormula(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.DamageDice) {
    return raw;
  }
  if (!('diceNumber' in raw) || typeof raw.diceNumber !== 'string') {
    return raw;
  }
  return { ...raw, diceNumber: fromFoundryFormula(raw.diceNumber) };
}

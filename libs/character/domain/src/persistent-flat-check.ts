import { Dc } from '@pioneer/rules/sdk';

import type { PersistentDamage } from './conditions';

/** The flat check that ends persistent damage is against DC 15, or DC 10 with assisted recovery (Player Core). */
const FLAT_CHECK_DC = Dc.parse(15);
const ASSISTED_FLAT_CHECK_DC = Dc.parse(10);

/** A lower flat check DC against persistent damage of some types (a quenching rune); no `assisted` means assistance ends it. */
export interface PersistentFlatCheckDc {
  readonly damageTypes: readonly PersistentDamage['type'][];
  readonly dc: Dc;
  readonly assisted: Dc | undefined;
}

/**
 * The DC of the flat check that ends `persistent`: 15, or 10 with assisted recovery, or the lowest DC of the
 * `flatChecks` for its type. Undefined when assisted recovery ends it without a check (a true quenching rune).
 */
export function flatCheckDc(
  { type, assisted }: PersistentDamage,
  flatChecks: readonly PersistentFlatCheckDc[],
): Dc | undefined {
  const matching = flatChecks.filter(({ damageTypes }) => damageTypes.includes(type));
  if (assisted && matching.some((each) => each.assisted === undefined)) {
    return undefined;
  }
  const base = assisted ? ASSISTED_FLAT_CHECK_DC : FLAT_CHECK_DC;
  const lowered = matching.map((each) => (assisted ? each.assisted : each.dc)).filter((dc) => dc !== undefined);
  return Dc.parse(Math.min(base, ...lowered));
}

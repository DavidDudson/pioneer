import { AttributeModifier, Level } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** How a boost raises an attribute: by one (partially from +4), or as the apex increase of Automatic Bonus Progression. */
export const BoostKind = { Regular: 'regular', Apex: 'apex' } as const;

export type BoostKind = ValueOf<typeof BoostKind>;

/** The level of the apex attribute increase (GM Core's Automatic Bonus Progression). */
export const APEX_LEVEL = Level.parse(17);

/** `sets` in level order, so the apex increase falls between the 15th and 20th level boosts. */
export function inLevelOrder<Set extends { readonly level: Level }>(sets: ReadonlyArray<Set>): ReadonlyArray<Set> {
  return sets.toSorted((first, second) => first.level - second.level);
}

/** The modifier an apex increase lifts an attribute to, when that is higher than one more (GM Core). */
const APEX_MODIFIER = AttributeModifier.parse(4);

/** A boost to a modifier this high or higher is partial: two partial boosts raise it by one. */
const PARTIAL_BOOST_FROM = 4;

/**
 * One attribute's modifier: +0, or -1 with a flaw, then one more for each boost that raises it, in level order; `apex`
 * gives its kind. From +4 a boost is partial, and the second partial boost raises it by one
 * (Player Core). An apex increase raises it by one, or to +4 when that is higher, and is never partial (GM Core).
 */
export function modifierOf(flawed: boolean, boosts: ReadonlyArray<BoostKind>): AttributeModifier {
  let total = flawed ? -1 : 0;
  let partial = false;

  for (const boost of boosts) {
    if (boost === BoostKind.Apex) {
      total = Math.max(total + 1, APEX_MODIFIER);
      partial = false;
    } else if (total < PARTIAL_BOOST_FROM || partial) {
      total += 1;
      partial = false;
    } else {
      partial = true;
    }
  }

  return AttributeModifier.parse(total);
}

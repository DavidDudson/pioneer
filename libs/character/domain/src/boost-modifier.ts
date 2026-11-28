import { AttributeModifier } from '@pioneer/rules/sdk';

/** The modifier an apex increase lifts an attribute to, when that is higher than one more (GM Core). */
const APEX_MODIFIER = 4;

/** A boost to a modifier this high or higher is partial: two partial boosts raise it by one. */
const PARTIAL_BOOST_FROM = 4;

/**
 * One attribute's modifier: +0, or -1 with a flaw, then one more for each boost that raises it, in level order; `apex`
 * says whether each is an apex increase. From +4 a boost is partial, and the second partial boost raises it by one
 * (Player Core). An apex increase raises it by one, or to +4 when that is higher, and is never partial (GM Core).
 */
export function modifierOf(flawed: boolean, apex: ReadonlyArray<boolean>): AttributeModifier {
  let total = flawed ? -1 : 0;
  let partial = false;

  for (const isApex of apex) {
    if (isApex) {
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

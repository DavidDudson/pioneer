import { Modifier as ModifierAmount, ModifierTarget, ModifierType, RuleSlug } from '@pioneer/rules/sdk';
import type { RuneGrade } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { EngineMessage } from './messages';
import type { ModifierSource } from './modifier';
import { RuleId } from './rule-in-play';
import type { WeaponInputs } from './source-inputs';

/** The core rules pack's Strike family: a weapon's potency reaches its instance, `strike:<slug>`. */
const STRIKE = 'strike';

/** Lets an `AdjustModifier` find a potency line: Automatic Bonus Progression replaces it through this slug. */
const WEAPON_POTENCY = RuleSlug.parse('weapon-potency');

/** The potency line of one weapon: its potency rune, or a bomb's own item bonus. */
function potencyLine(weapon: WeaponInputs, potency: RuneGrade): ModifierSource {
  return {
    modifier: {
      id: RuleId.parse(`weapon:${weapon.slug}#${WEAPON_POTENCY}`),
      slug: WEAPON_POTENCY,
      label: { message: message(EngineMessage.WeaponPotency, { weapon: weapon.slug }) },
      type: ModifierType.Item,
      targets: [ModifierTarget.parse(`${STRIKE}:${weapon.slug}`)],
      predicate: undefined,
      origin: weapon.origin,
    },
    value: ModifierAmount.parse(potency),
    itemLevel: undefined,
    summary: undefined,
  };
}

/**
 * A synthetic `item` modifier on each weapon's Strike for its potency, so it stacks with other item bonuses to attack
 * rolls the way PF2e says (only the highest applies) instead of adding to the base. Weapons without potency add none.
 */
export function weaponPotencies(weapons: readonly WeaponInputs[]): readonly ModifierSource[] {
  return weapons.flatMap(({ potency, ...weapon }) => (potency === undefined ? [] : [potencyLine(weapon, potency)]));
}

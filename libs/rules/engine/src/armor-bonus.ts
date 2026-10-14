import { Attribute, Modifier, ModifierTarget, ModifierType, RuleSlug } from '@pioneer/rules/sdk';
import type { AttributeModifier, AttributeModifiers, CheckPenalty, Origin, RuneGrade } from '@pioneer/rules/sdk';

import type { ModifierSource } from './modifier';
import { NO_ITEM, RuleId } from './rule-in-play';

/** Worn armour, as AC and saves read it. */
export interface ArmorInputs {
  /** Its item bonus to AC: the armour's own bonus and its potency rune's. */
  readonly bonus: Modifier;
  /** Its resilient rune's grade, an item bonus to every save; none when it has none, or its runes don't work. */
  readonly resilient?: RuneGrade | undefined;
  /** The size of its check penalty to Strength- and Dexterity-based skill checks: 1 is -1. None when it has none. */
  readonly checkPenalty?: CheckPenalty | undefined;
  /** The Strength modifier at which its check penalty goes away. None when it names none. */
  readonly strength?: AttributeModifier | undefined;
  /** Why the character wears it: its entry and the inventory hop that put it there. The lines' origin and name. */
  readonly origin: Origin;
}

/** The core rules pack's Armor Class selector. */
const AC = ModifierTarget.parse('ac');

/** The domain every save is in. */
const SAVING_THROW = ModifierTarget.parse('saving-throw');

/** Lets an `AdjustModifier` find the armour's line, for anything that changes its bonus. */
const ARMOR_BONUS = RuleSlug.parse('armor-bonus');

/** The skills an armour's check penalty applies to: those keyed to Strength or Dexterity. */
const PHYSICAL_SKILLS = ['acrobatics', 'athletics', 'stealth', 'thievery'].map((skill) =>
  ModifierTarget.parse(`skill:${skill}`),
);

/** Lets an `AdjustModifier` find the armour's check penalty line. */
export const CHECK_PENALTY = RuleSlug.parse('check-penalty');

/** Lets an `AdjustModifier` find the resilient rune's line. */
const RESILIENT = RuleSlug.parse('resilient');

/** One of the armour's lines: what it is (`slug`), the statistic or domain it targets, and by how much. */
interface ArmorLine {
  readonly slug: RuleSlug;
  readonly target: ModifierTarget;
  readonly value: Modifier;
}

function armorLine(origin: Origin, { slug, target, value }: ArmorLine): ModifierSource {
  return {
    modifier: {
      id: RuleId.parse(`${origin.entry}#${slug}`),
      slug,
      label: { entry: origin.entry },
      type: ModifierType.Item,
      targets: [target],
      predicate: undefined,
      origin,
    },
    value,
    item: NO_ITEM,
    summary: undefined,
  };
}

/** The check penalty lines of armour: one per physical skill, none when it has no penalty or the wearer is strong enough. */
function checkPenaltyLines(armor: ArmorInputs, attributes: AttributeModifiers): readonly ModifierSource[] {
  const { checkPenalty, strength, origin } = armor;
  if (checkPenalty === undefined || (strength !== undefined && attributes.get(Attribute.Strength) >= strength)) {
    return [];
  }
  const value = Modifier.parse(0 - Number(checkPenalty));
  return PHYSICAL_SKILLS.map((target) => armorLine(origin, { slug: CHECK_PENALTY, target, value }));
}

/**
 * Synthetic `item` modifiers for worn armour, named by the armour, so they stack with other item bonuses the way PF2e
 * says (only the highest applies): its bonus to AC, its resilient rune's to every save, and its check penalty to
 * Acrobatics, Athletics, Stealth and Thievery unless the wearer's Strength meets the armour's. No armour adds none,
 * nor does armour with no bonus (clothing) to AC, no resilient rune to saves, or no check penalty to skills.
 */
export function armorBonus(armor: ArmorInputs | undefined, attributes: AttributeModifiers): readonly ModifierSource[] {
  if (armor === undefined) {
    return [];
  }
  const { bonus, resilient, origin } = armor;
  return [
    ...checkPenaltyLines(armor, attributes),
    ...(bonus === 0 ? [] : [armorLine(origin, { slug: ARMOR_BONUS, target: AC, value: bonus })]),
    ...(resilient === undefined
      ? []
      : [armorLine(origin, { slug: RESILIENT, target: SAVING_THROW, value: Modifier.parse(resilient) })]),
  ];
}

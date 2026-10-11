import { Modifier, ModifierTarget, ModifierType, RuleSlug } from '@pioneer/rules/sdk';
import type { Origin, RuneGrade } from '@pioneer/rules/sdk';

import type { ModifierSource } from './modifier';
import { NO_ITEM, RuleId } from './rule-in-play';

/** Worn armour, as AC and saves read it. */
export interface ArmorInputs {
  /** Its item bonus to AC: the armour's own bonus and its potency rune's. */
  readonly bonus: Modifier;
  /** Its resilient rune's grade, an item bonus to every save; none when it has none, or its runes don't work. */
  readonly resilient?: RuneGrade | undefined;
  /** Why the character wears it: its entry and the inventory hop that put it there. The lines' origin and name. */
  readonly origin: Origin;
}

/** The core rules pack's Armor Class selector. */
const AC = ModifierTarget.parse('ac');

/** The domain every save is in. */
const SAVING_THROW = ModifierTarget.parse('saving-throw');

/** Lets an `AdjustModifier` find the armour's line, for anything that changes its bonus. */
const ARMOR_BONUS = RuleSlug.parse('armor-bonus');

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

/**
 * Synthetic `item` modifiers for worn armour, named by the armour, so they stack with other item bonuses the way PF2e
 * says (only the highest applies): its bonus to AC, and its resilient rune's to every save. No armour adds none, nor
 * does armour with no bonus (clothing) to AC, or no resilient rune to saves.
 */
export function armorBonus(armor: ArmorInputs | undefined): readonly ModifierSource[] {
  if (armor === undefined) {
    return [];
  }
  const { bonus, resilient, origin } = armor;
  return [
    ...(bonus === 0 ? [] : [armorLine(origin, { slug: ARMOR_BONUS, target: AC, value: bonus })]),
    ...(resilient === undefined
      ? []
      : [armorLine(origin, { slug: RESILIENT, target: SAVING_THROW, value: Modifier.parse(resilient) })]),
  ];
}

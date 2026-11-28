import { NO_MODIFIERS } from '@pioneer/rules/engine';
import type { ModifierInputs } from '@pioneer/rules/engine';
import { ContentKind, NumericItemProperty } from '@pioneer/rules/sdk';
import type { RuneGrade } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemEntry } from './inventory-content';
import { alteredItem, gradeOf } from './item-alteration-inputs';
import { itemPotency, itemRunes } from './item-runes';
import type { RuneContent } from './item-runes';

/** What a weapon's runes and the rules in play leave of its potency and striking grades. */
export interface WeaponGrades {
  readonly potency: RuneGrade | undefined;
  readonly striking: RuneGrade | undefined;
}

/** What reads a weapon's grades: the runes the packs offer, and the rules in play whose `ItemAlteration`s change them. */
export interface GradeReads {
  readonly runes: RuneContent;
  /** The rules in play (the variants in force, the character's items); none when absent, so the runes count as etched. */
  readonly rules?: ModifierInputs | undefined;
}

/**
 * The potency and striking grades of the weapon on `line` after the `ItemAlteration` elements in play changed them, as
 * its Strike reads them: Automatic Bonus Progression sets them by the character's level, whatever the runes are.
 * Without a weapon entry or any alteration they are the runes' own.
 */
export function weaponGrades(
  line: InventoryItem,
  base: ItemEntry | undefined,
  { runes, rules = NO_MODIFIERS }: GradeReads,
): WeaponGrades {
  const etched = itemRunes(line, base);
  const potency = itemPotency(etched, (rune) => runes.get(rune));

  if (base?.kind !== ContentKind.Weapon) {
    return { potency, striking: etched.striking };
  }

  const altered = alteredItem(rules, base, { item: line.id, potency, striking: etched.striking });

  return {
    potency: gradeOf(altered, NumericItemProperty.Potency),
    striking: gradeOf(altered, NumericItemProperty.Striking),
  };
}

import { attributeModifiers, boostContent, boostSlots, BoostSource } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { AttributeModifiers, ContentRegistry } from '@pioneer/rules/sdk';
import type { OpenBoostLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';

/** What the sheet's attributes section shows: the modifiers the boosts give, then the boosts not placed yet. */
export interface SheetAttributes {
  readonly modifiers: AttributeModifiers;
  readonly open: readonly OpenBoostLine[];
}

/** What each boost slot is called, by where its boost comes from. */
export const BOOST_LABEL_KEYS: Readonly<Record<BoostSource, string>> = {
  [BoostSource.Ancestry]: 'rules.attributes.boost.ancestry',
  [BoostSource.Background]: 'rules.attributes.boost.background',
  [BoostSource.Class]: 'rules.attributes.boost.class',
  [BoostSource.Free]: 'rules.attributes.boost.free',
};

/**
 * The character's attribute modifiers, worked out from its boost picks, and its empty boost slots up to its level.
 * Slots above it are the plan, not yet missing.
 */
export function sheetAttributes(registry: ContentRegistry, character: Character): SheetAttributes {
  const content = boostContent(registry);
  const open = boostSlots(character.document, content).flatMap((slot): OpenBoostLine[] =>
    slot.pick === undefined && slot.level <= character.level
      ? [{ key: slot.key, label: message(BOOST_LABEL_KEYS[slot.source], { level: slot.level }) }]
      : [],
  );
  return { modifiers: attributeModifiers(character.document, content), open };
}

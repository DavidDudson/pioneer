import { attributeModifiers, boostContent, boostSlots, BoostSource } from '@pioneer/character/domain';
import type { BoostSlot, Character } from '@pioneer/character/domain';
import type { Attribute, AttributeModifiers, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { OpenBoostLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

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

/** A boost slot above the character's level: its label and the attributes it offers once the character is there. */
export interface SheetPlannedBoost {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly Attribute[];
}

/** The boost slots above the character's level (#492), lowest first, each with the attributes it offers. */
export function sheetPlannedBoosts(registry: ContentRegistry, character: Character): readonly SheetPlannedBoost[] {
  const planned = boostSlots(character.document, boostContent(registry)).filter((slot) => slot.level > character.level);
  return planned.map((slot) => ({
    key: slot.key,
    label: plannedBoostLabel(slot, planned),
    options: slot.options,
  }));
}

/** A planned boost's label, numbered when its level has several of its source ("Level 5 boost 2"), so each picker has a name of its own. */
function plannedBoostLabel(slot: BoostSlot, planned: readonly BoostSlot[]): MessageDescriptor {
  const level = { level: slot.level };
  const alike = planned.filter((each) => each.source === slot.source && each.level === slot.level);
  return alike.length === 1 || slot.source !== BoostSource.Free
    ? message(BOOST_LABEL_KEYS[slot.source], level)
    : message('rules.attributes.boost.freeNumbered', { ...level, number: alike.indexOf(slot) + 1 });
}

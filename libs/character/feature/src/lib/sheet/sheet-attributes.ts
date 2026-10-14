import { attributeModifiers, boostContent, boostSlots, BoostSource } from '@pioneer/character/domain';
import type { BoostSlot, Character } from '@pioneer/character/domain';
import { ATTRIBUTE_MODIFIER_MAX } from '@pioneer/rules/sdk';
import type { Attribute, AttributeModifiers, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';
import type { AttributePickerRow, OpenBoostLine } from '@pioneer/rules/ui';
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
  /** What the attribute table shows of each attribute on offer. */
  readonly rows: readonly AttributePickerRow[];
}

/**
 * The attribute table's row for each attribute a boost slot offers: the modifier without this slot's boost, and what
 * the boost makes it. The slot's own pick is taken out of the modifier, so it never counts twice.
 */
function boostRows(
  slot: BoostSlot,
  modifiers: AttributeModifiers,
  translate: (key: string) => string,
): readonly AttributePickerRow[] {
  return slot.options.map((attribute): AttributePickerRow => {
    const current = modifiers.get(attribute) - (slot.pick === attribute ? 1 : 0);
    return {
      id: attribute,
      name: translate(ATTRIBUTE_MESSAGES[attribute]),
      modifier: current,
      boosted: Math.min(current + 1, ATTRIBUTE_MODIFIER_MAX),
      disabledReason: undefined,
    };
  });
}

/** The boost slots above the character's level (#492), lowest first, each with the attributes it offers. */
export function sheetPlannedBoosts(
  registry: ContentRegistry,
  character: Character,
  translate: (key: string) => string,
): readonly SheetPlannedBoost[] {
  const content = boostContent(registry);
  const planned = boostSlots(character.document, content).filter((slot) => slot.level > character.level);
  const modifiers = attributeModifiers(character.document, content);
  return planned.map((slot) => ({
    key: slot.key,
    label: plannedBoostLabel(slot, planned),
    options: slot.options,
    rows: boostRows(slot, modifiers, translate),
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

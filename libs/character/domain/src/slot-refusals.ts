import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import { boostSets, flawSlots } from './attribute-boosts';
import type { BoostContent, BoostSet, BoostSlot, FlawSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';

/** The part of a pick a refusal blames. */
export const SlotRefusalField = { Slot: 'slot', Selection: 'selection' } as const;
export type SlotRefusalField = ValueOf<typeof SlotRefusalField>;

/** Why a pick is refused, and which part of it is wrong. */
export interface SlotRefusal {
  readonly field: SlotRefusalField;
  readonly message: MessageDescriptor;
}

export const NOT_OFFERED: SlotRefusal = {
  field: SlotRefusalField.Selection,
  message: message('character.validation.selectionNotOffered'),
};

/** The boost slot `slot` and its set, if it is one the character has. */
export interface BoostSlotIn {
  readonly set: BoostSet;
  readonly boost: BoostSlot;
}

export function boostSlotIn(document: CharacterDocument, boosts: BoostContent, slot: SlotKey): BoostSlotIn | undefined {
  for (const set of boostSets(document, boosts)) {
    const boost = set.slots.find((each) => each.key === slot);
    if (boost !== undefined) {
      return { set, boost };
    }
  }
  return undefined;
}

/** Why `selection` can't go in the boost slot: its boost must allow it, and no other boost of its set raise it. */
export function boostRefusal({ set, boost }: BoostSlotIn, selection: ChoiceValue): SlotRefusal | undefined {
  if (!boost.options.some((attribute) => attribute === selection)) {
    return NOT_OFFERED;
  }
  const taken = set.slots.some((other) => other.key !== boost.key && other.pick === selection);
  return taken ? { field: SlotRefusalField.Selection, message: message('character.validation.boostTaken') } : undefined;
}

/** The voluntary flaw slot `slot` and the character's other flaw slots, if it is one the character has. */
export interface FlawSlotIn {
  readonly slots: readonly FlawSlot[];
  readonly flaw: FlawSlot;
}

export function flawSlotIn(document: CharacterDocument, boosts: BoostContent, slot: SlotKey): FlawSlotIn | undefined {
  const slots = flawSlots(document, boosts);
  const flaw = slots.find((each) => each.key === slot);
  return flaw === undefined ? undefined : { slots, flaw };
}

/** Why `selection` can't go in the flaw slot: neither the ancestry nor another voluntary flaw may lower it already. */
export function flawRefusal({ slots, flaw }: FlawSlotIn, selection: ChoiceValue): SlotRefusal | undefined {
  if (!flaw.options.some((attribute) => attribute === selection)) {
    return NOT_OFFERED;
  }
  const taken = slots.some((other) => other.key !== flaw.key && other.pick === selection);
  return taken ? { field: SlotRefusalField.Selection, message: message('character.validation.flawTaken') } : undefined;
}

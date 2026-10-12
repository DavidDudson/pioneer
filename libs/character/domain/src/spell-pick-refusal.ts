import type { SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { isSpellSlotKey, PreparedRefusal, preparedRefusal } from './prepared-spells';
import type { PreparedReads } from './prepared-spells';
import { isSignatureKey, SignatureRefusal, signatureRefusal } from './signature-spells';
import type { SlotPick } from './slot-offer';
import { NOT_OFFERED, SlotRefusalField } from './slot-refusals';
import type { SlotRefusal } from './slot-refusals';

const NOT_OPEN: SlotRefusal = { field: SlotRefusalField.Slot, message: message('character.validation.slotNotOpen') };

/** The refusal for each reason a prepared or repertoire slot refuses a spell. */
const PREPARED_REFUSALS: Readonly<Record<PreparedRefusal, SlotRefusal>> = {
  [PreparedRefusal.NotOpen]: NOT_OPEN,
  [PreparedRefusal.NotOffered]: NOT_OFFERED,
  [PreparedRefusal.NoAccess]: {
    field: SlotRefusalField.Selection,
    message: message('character.validation.spellNoAccess'),
  },
};

/** The refusal for each reason a signature slot refuses a spell. */
const SIGNATURE_REFUSALS: Readonly<Record<SignatureRefusal, SlotRefusal>> = {
  [SignatureRefusal.NotOpen]: NOT_OPEN,
  [SignatureRefusal.NotOffered]: NOT_OFFERED,
};

/** Whether `slot` is a spell pick's key: a prepared, repertoire or signature slot's. */
export function isSpellPickKey(slot: SlotKey): boolean {
  return isSpellSlotKey(slot) || isSignatureKey(slot);
}

/**
 * Why a spell pick's spell can't go in its slot, or undefined when it can: a prepared or repertoire slot takes a spell
 * it offers at the character's level; a signature slot, one its entry's repertoire knows at its rank (#479).
 */
export function spellPickRefusal(
  document: CharacterDocument,
  reads: PreparedReads,
  pick: SlotPick,
): SlotRefusal | undefined {
  if (isSignatureKey(pick.slot)) {
    const refusal = signatureRefusal(document, reads, pick);
    return refusal === undefined ? undefined : SIGNATURE_REFUSALS[refusal];
  }
  const refusal = preparedRefusal(document, reads, pick);
  return refusal === undefined ? undefined : PREPARED_REFUSALS[refusal];
}

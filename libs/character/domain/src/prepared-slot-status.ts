import { message } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { SlotInvalidMessage, SlotSubjectKind } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { PreparedPickProblem, preparedSlots } from './prepared-spells';
import { signatureSlots } from './signature-spells';
import { preparedReads } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { invalidReason, invalidSlot, validSlot } from './slot-read';
import type { SlotRead } from './slot-read';

/** The reason a prepared pick that names a loaded spell counts for nothing. */
const PREPARED_PROBLEMS: Readonly<Record<PreparedPickProblem, string>> = {
  [PreparedPickProblem.NoAccess]: SlotInvalidMessage.SpellNoAccess,
  [PreparedPickProblem.Unfit]: SlotInvalidMessage.SpellUnfit,
  [PreparedPickProblem.NotInPool]: SlotInvalidMessage.SpellNotInPool,
};

/**
 * Each prepared and repertoire slot at the character's level (#478, #479): a pick is invalid when the slot doesn't take
 * it, an uncommon or rare spell without access saying so. They open at the character's level only, so none is planned.
 */
export function preparedStatuses(document: CharacterDocument, content: SlotContent): CharacterSlot[] {
  return preparedSlots(document, preparedReads(document, content)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: {
        kind: SlotSubjectKind.Spell,
        entry: slot.entry,
        ...(slot.pool === undefined ? {} : { pool: slot.pool.slug }),
        rank: slot.rank,
      },
      stored: slot.stored,
      planned: undefined,
    };
    if (slot.stored === undefined || slot.pick !== undefined) {
      return validSlot(read, slot.pick?.name);
    }
    const reason =
      slot.problem === undefined
        ? invalidReason(slot.stored, content.lookup)
        : message(PREPARED_PROBLEMS[slot.problem]);
    return invalidSlot(read, slot.stored, reason);
  });
}

/**
 * Each signature slot at the character's level (#479): a pick is invalid when the entry's repertoire no longer knows
 * it at the slot's rank. Like a repertoire's, signature slots open at the character's level only, so none is planned.
 */
export function signatureStatuses(document: CharacterDocument, content: SlotContent): CharacterSlot[] {
  return signatureSlots(document, preparedReads(document, content)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: { kind: SlotSubjectKind.Signature, entry: slot.entry, rank: slot.rank },
      stored: slot.stored,
      planned: undefined,
    };
    if (slot.stored === undefined || slot.pick !== undefined) {
      return validSlot(read, slot.pick?.name);
    }
    const reason =
      slot.problem === undefined
        ? invalidReason(slot.stored, content.lookup)
        : message(SlotInvalidMessage.SpellNotInRepertoire);
    return invalidSlot(read, slot.stored, reason);
  });
}

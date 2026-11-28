import { Level } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterLevel } from './character-fields';
import { SlotInvalidMessage, SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';
import { familiarSpellSlots } from './familiar-spells';
import { PreparedPickProblem } from './prepared-pick-problem';
import { preparedSlots } from './prepared-spells';
import { signatureSlots } from './signature-spells';
import { preparedReads } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { invalidReason, invalidSlot, validSlot } from './slot-read';
import type { SlotRead } from './slot-read';

type SpellSubject = Extract<SlotSubject, { readonly kind: typeof SlotSubjectKind.Spell }>;

/** The reason a prepared pick that names a loaded spell counts for nothing. */
const PREPARED_PROBLEMS: Readonly<Record<PreparedPickProblem, string>> = {
  [PreparedPickProblem.NoAccess]: SlotInvalidMessage.SpellNoAccess,
  [PreparedPickProblem.Unfit]: SlotInvalidMessage.SpellUnfit,
  [PreparedPickProblem.NotInPool]: SlotInvalidMessage.SpellNotInPool,
};

/** The document as it reads at `at`: only its level differs, so a cantrip heightens as it would then. */
function atLevel(document: CharacterDocument, at: Level): CharacterDocument {
  return { ...document, level: CharacterLevel.parse(at) };
}

/** The level a slot read at `at` is planned at: undefined at the character's level or below. */
function plannedAt(document: CharacterDocument, at: Level): Level | undefined {
  return at > document.level ? at : undefined;
}

/**
 * Each prepared and repertoire slot the character has at `at` (#478, #479), its level unless a later one is asked: a
 * pick is invalid when the slot doesn't take it, an uncommon or rare spell without access saying so. Read above the
 * character's level, a slot is planned there (#634).
 */
export function preparedStatuses(
  document: CharacterDocument,
  content: SlotContent,
  at: Level = Level.parse(document.level),
): Array<CharacterSlot> {
  const planned = plannedAt(document, at);

  return preparedSlots(atLevel(document, at), preparedReads(document, content, at)).map((slot) => {
    const subject: SpellSubject = { kind: SlotSubjectKind.Spell, entry: slot.entry, rank: slot.rank };

    if (slot.pool !== undefined) {
      subject.pool = slot.pool.slug;
    }

    if (slot.granted) {
      subject.granted = true;
    }

    const read: SlotRead = { key: slot.key, subject, stored: slot.stored, planned };

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
 * Each signature slot the character has at `at` (#479), its level unless a later one is asked: a pick is invalid when
 * the entry's repertoire no longer knows it at the slot's rank. Read above the character's level, a slot is planned
 * there (#634).
 */
export function signatureStatuses(
  document: CharacterDocument,
  content: SlotContent,
  at: Level = Level.parse(document.level),
): Array<CharacterSlot> {
  const planned = plannedAt(document, at);

  return signatureSlots(atLevel(document, at), preparedReads(document, content, at)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: { kind: SlotSubjectKind.Signature, entry: slot.entry, rank: slot.rank },
      stored: slot.stored,
      planned,
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

/**
 * Each slot of the spells the witch's familiar knows at `at` (ADR-0044), its level unless a later one is asked: a pick is
 * invalid when the slot doesn't take it. Read above the character's level, a slot is planned there.
 */
export function familiarSpellStatuses(
  document: CharacterDocument,
  content: SlotContent,
  at: Level = Level.parse(document.level),
): Array<CharacterSlot> {
  const planned = plannedAt(document, at);

  return familiarSpellSlots(atLevel(document, at), preparedReads(document, content, at)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: { kind: SlotSubjectKind.FamiliarSpell, entry: slot.entry, rank: slot.rank },
      stored: slot.stored,
      planned,
    };

    if (slot.stored === undefined || slot.pick !== undefined) {
      return validSlot(read, slot.pick?.name);
    }

    return invalidSlot(read, slot.stored, invalidReason(slot.stored, content.lookup));
  });
}

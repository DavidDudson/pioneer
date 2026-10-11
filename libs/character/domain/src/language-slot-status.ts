import { Level } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { SlotInvalidMessage, SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';
import { LanguagePickProblem, languageSlots } from './languages';
import type { LanguageSlot } from './languages';
import { languageReads } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { invalidReason, invalidSlot, validSlot } from './slot-read';
import type { SlotRead } from './slot-read';

/** The reason a language pick that names a loaded language counts for nothing. */
const LANGUAGE_PROBLEMS: Readonly<Record<LanguagePickProblem, string>> = {
  [LanguagePickProblem.Known]: SlotInvalidMessage.LanguageKnown,
  [LanguagePickProblem.Rare]: SlotInvalidMessage.NotOffered,
};

function languageSubject({ level, feature }: LanguageSlot): SlotSubject {
  return feature === undefined
    ? { kind: SlotSubjectKind.Language, level }
    : { kind: SlotSubjectKind.Language, level, entry: feature.entry, entryName: feature.name };
}

/**
 * Each language slot up to 20th level, read in order (#470): a pick is invalid when the character knows the language
 * already, or it is rarer than the slot offers; one naming no loaded language reads as any other pick does.
 */
export function languageStatuses(document: CharacterDocument, content: SlotContent): CharacterSlot[] {
  const level = Level.parse(document.level);
  return languageSlots(document, languageReads(document, content)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: languageSubject(slot),
      stored: slot.stored,
      planned: slot.level > level ? slot.level : undefined,
    };
    if (slot.stored === undefined || slot.pick !== undefined) {
      return validSlot(read, slot.pick?.name);
    }
    const reason =
      slot.problem === undefined
        ? invalidReason(slot.stored, content.lookup)
        : message(LANGUAGE_PROBLEMS[slot.problem]);
    return invalidSlot(read, slot.stored, reason);
  });
}

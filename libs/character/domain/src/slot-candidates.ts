import { ChoiceValue, Level } from '@pioneer/rules/sdk';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';

import { boostSlots } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { featSlots, PrerequisiteStatus } from './feat-slots';
import { languageSlots } from './languages';
import { preparedSlots } from './prepared-spells';
import { signatureSlots } from './signature-spells';
import { skillSlots } from './skill-training';
import { languageReads, preparedReads, resolveSlotsAt, rootSlotOptions, skillReads } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { picksOf } from './slot-reads';

/** A read of the slot `key`'s options as picks, for one kind of slot. */
type Candidates = (document: CharacterDocument, content: SlotContent, key: SlotKey) => readonly ChoiceValue[];

interface Identified {
  readonly id: ContentId;
}

/** The ids of the things a slot offers, each as a pick. */
function idsOf(options: readonly Identified[] | undefined): readonly ChoiceValue[] {
  return (options ?? []).map(({ id }) => ChoiceValue.parse(id));
}

/**
 * A `ChoiceSet` slot as the character's level opens it, its options as picks; a feat slot offers only the feats whose
 * prerequisites are met and no dedication waits on. A feat whose prerequisites are unknown is left out: they may not
 * hold.
 */
const choiceCandidates: Candidates = (document, content, key) => {
  const feat = featSlots(document, content).find((slot) => slot.key === key);
  if (feat !== undefined) {
    return feat.options
      .filter((option) => option.status === PrerequisiteStatus.Met && option.locked === undefined)
      .map((option) => ChoiceValue.parse(option.value));
  }
  const { open } = resolveSlotsAt(Level.parse(document.level), { ...content, picks: picksOf(document) });
  return (open.find((slot) => slot.key === key)?.options ?? []).map((option) => option.value);
};

const CANDIDATES: Readonly<Record<SlotSubjectKind, Candidates>> = {
  [SlotSubjectKind.Root]: (document, content, key) => rootSlotOptions(document, content, key).map(({ value }) => value),
  [SlotSubjectKind.Boost]: (document, content, key) =>
    (boostSlots(document, content.boosts).find((slot) => slot.key === key)?.options ?? []).map((attribute) =>
      ChoiceValue.parse(attribute),
    ),
  [SlotSubjectKind.Skill]: (document, content, key) =>
    idsOf(skillSlots(document, skillReads(document, content)).find((slot) => slot.key === key)?.options),
  [SlotSubjectKind.Language]: (document, content, key) =>
    idsOf(languageSlots(document, languageReads(document, content)).find((slot) => slot.key === key)?.options),
  [SlotSubjectKind.Choice]: choiceCandidates,
  [SlotSubjectKind.Spell]: (document, content, key) =>
    idsOf(preparedSlots(document, preparedReads(document, content)).find((slot) => slot.key === key)?.options),
  [SlotSubjectKind.Signature]: (document, content, key) =>
    idsOf(signatureSlots(document, preparedReads(document, content)).find((slot) => slot.key === key)?.options),
  /** A voluntary flaw is never filled for the character. */
  [SlotSubjectKind.Flaw]: () => [],
};

/**
 * What an open slot offers, as picks, for every kind of slot the character fills: its own slots, a boost, a trained
 * skill or increase, a language, a `ChoiceSet`, a prepared or repertoire spell, a signature spell. Nothing outside the
 * list is accepted, though `slotRefusal` has the last word on what is inside. Empty for a slot that isn't open.
 */
export function slotCandidates(
  document: CharacterDocument,
  content: SlotContent,
  slot: CharacterSlot,
): readonly ChoiceValue[] {
  return slot.status === SlotStatus.Open ? CANDIDATES[slot.subject.kind](document, content, slot.key) : [];
}

import { retrainDaysFor, slotCandidates, SlotStatus } from '@pioneer/character/domain';
import type { Character, CharacterSlot, SlotContent } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { lineOf } from '../sheet-choices';

/** A pick that can be retrained: its slot, what names the slot and what it holds. */
export interface RetrainSlot {
  readonly key: string;
  readonly label: MessageDescriptor;
  readonly holds: string;
}

/** The name of a pick: its entry's name, or the pick itself for a skill or a spell rank. */
export function pickName(content: SlotContent, value: string): string {
  const id = ContentId.safeParse(value);

  return (id.success ? content.lookup.entry(id.data)?.name : undefined) ?? value;
}

/** The filled slots a retraining can change, with what each holds. */
export function retrainableSlots(
  slots: ReadonlyArray<CharacterSlot>,
  content: SlotContent,
): ReadonlyArray<RetrainSlot> {
  return slots.flatMap((slot) => {
    if (slot.status !== SlotStatus.Filled || retrainDaysFor(slot.key) === undefined) {
      return [];
    }

    const line = lineOf(slot, content.lookup);

    return [{ key: slot.key, label: line.label, holds: slot.selectionName ?? pickName(content, slot.selection) }];
  });
}

/** What `slot` can become: what it offers with its own pick out of the way, as the server reads it, minus that pick. */
export function retrainTargets({
  character,
  content,
  slot,
}: {
  character: Character;
  content: SlotContent;
  slot: CharacterSlot;
}): ReadonlyArray<SelectOption<string>> {
  if (slot.status !== SlotStatus.Filled) {
    return [];
  }

  const { [slot.key]: held, ...choices } = character.document.build.choices;
  const emptied = { ...character.document, build: { ...character.document.build, choices } };
  const open: CharacterSlot = { status: SlotStatus.Open, key: slot.key, subject: slot.subject };

  return slotCandidates(emptied, content, open)
    .filter((value) => value !== held)
    .map((value) => ({ value, label: pickName(content, value) }));
}

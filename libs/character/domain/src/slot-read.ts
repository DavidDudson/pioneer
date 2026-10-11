import type { ContentLookup } from '@pioneer/rules/grants';
import { ContentId } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentText, Level, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { SlotInvalidMessage, SlotStatus } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';

/** How a slot reads at one level: the pick it holds, and the level it is planned at (undefined at the character's). */
export interface SlotRead {
  readonly key: SlotKey;
  readonly subject: SlotSubject;
  readonly stored: ChoiceValue | undefined;
  readonly planned: Level | undefined;
}

/** A selection's name, if it has one: none when undefined (`exactOptionalPropertyTypes`). */
export interface Named {
  readonly selectionName?: ContentText;
}

export function named(selectionName: ContentText | undefined): Named {
  return selectionName === undefined ? {} : { selectionName };
}

/** A slot whose pick, if any, it offers: open or filled at the character's level, else planned. */
export function validSlot(
  { key, subject, stored, planned }: SlotRead,
  selectionName: ContentText | undefined,
): CharacterSlot {
  if (planned !== undefined) {
    const selection = stored === undefined ? {} : { selection: stored };
    return { status: SlotStatus.Planned, key, subject, level: planned, ...selection, ...named(selectionName) };
  }
  if (stored === undefined) {
    return { status: SlotStatus.Open, key, subject };
  }
  return { status: SlotStatus.Filled, key, subject, selection: stored, ...named(selectionName) };
}

export function invalidSlot(
  { key, subject, planned }: SlotRead,
  selection: ChoiceValue,
  reason: MessageDescriptor,
): CharacterSlot {
  const level = planned === undefined ? {} : { level: planned };
  return { status: SlotStatus.Invalid, key, subject, selection, reason, ...level };
}

/** An entry id whose content isn't loaded; anything else the slot doesn't offer. */
export function invalidReason(value: ChoiceValue, lookup: ContentLookup): MessageDescriptor {
  const id = ContentId.safeParse(value);
  const unloaded = id.success && lookup.entry(id.data) === undefined;
  return message(unloaded ? SlotInvalidMessage.ContentNotLoaded : SlotInvalidMessage.NotOffered);
}

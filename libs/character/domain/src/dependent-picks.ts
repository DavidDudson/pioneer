import type { RootSlot } from '@pioneer/rules/grants';
import { ChoiceValue, ContentText, Level, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { resolveSlotsAt } from './slot-offer';
import type { SlotContent } from './slot-offer';

/**
 * A pick an edit cleared because the slot it is within changed: a heritage the new ancestry doesn't offer. The PATCH
 * that cleared it reports it once, so the sheet can say what went; nothing of it is stored.
 */
export const ClearedPick = z.strictObject({
  key: SlotKey,
  selection: ChoiceValue,
  selectionName: ContentText.optional(),
});
export type ClearedPick = z.output<typeof ClearedPick>;

/** The character's root slots over its picks. They don't depend on the level, so they are read at its own. */
function rootSlots(document: CharacterDocument, content: SlotContent): readonly RootSlot[] {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  return resolveSlotsAt(Level.parse(document.level), { ...content, picks }).rootSlots;
}

/** The root slots within another that `document` answers, by key. */
function answeredWithin(document: CharacterDocument, content: SlotContent): ReadonlyMap<SlotKey, RootSlot> {
  const answered = rootSlots(document, content).filter((slot) => slot.within !== undefined && slot.pick !== undefined);
  return new Map(answered.map((slot) => [slot.key, slot]));
}

/**
 * The picks of slots within another that `before` answered and `after` doesn't, though it keeps the pick: changing
 * the ancestry leaves a heritage of the old one, which the new one doesn't offer. A pick already unanswered before
 * (content not loaded, an errata) isn't the edit's doing, so it stays and its slot reads invalid.
 */
export function unfitPicks(before: CharacterDocument, after: CharacterDocument, content: SlotContent): ClearedPick[] {
  const wasAnswered = answeredWithin(before, content);
  return rootSlots(after, content).flatMap((slot): ClearedPick[] => {
    const kept = after.build.choices[slot.key];
    const earlier = wasAnswered.get(slot.key);
    if (earlier?.pick === undefined || kept !== earlier.pick || slot.pick !== undefined) {
      return [];
    }
    const name = content.lookup.entry(earlier.pick)?.name;
    return [{ key: slot.key, selection: kept, ...(name === undefined ? {} : { selectionName: name }) }];
  });
}

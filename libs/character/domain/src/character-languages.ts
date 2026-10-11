import { ContentId, ContentText, LanguageCount, Level, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { languagesOf, LanguageSource, openLanguageSlots } from './languages';
import type { KnownLanguage, LanguageSlot } from './languages';
import { languageReads } from './slot-offer';
import type { SlotContent } from './slot-offer';

const LANGUAGES_MAX = 128;

/** A language the character knows, as the sheet lists it: where it came from by name, and the slot of a pick. */
export const SheetLanguage = z.strictObject({
  id: ContentId,
  name: ContentText,
  source: z.enum(LanguageSource),
  /** The ancestry or feature that granted it; absent for a pick. */
  from: ContentText.optional(),
  /** The slot a pick fills; absent for a granted language. */
  slot: SlotKey.optional(),
});
export type SheetLanguage = z.output<typeof SheetLanguage>;

/** A language a slot offers, by name. */
const LanguageChoice = z.strictObject({ id: ContentId, name: ContentText });

/**
 * What the sheet shows of the character's languages (#470): those it knows at its level, how many it has left to add
 * there, and the next empty slot with what it offers, which Add language fills.
 */
export const CharacterLanguages = z.strictObject({
  known: z.array(SheetLanguage).max(LANGUAGES_MAX).readonly(),
  open: LanguageCount,
  next: z.strictObject({ slot: SlotKey, options: z.array(LanguageChoice).max(LANGUAGES_MAX).readonly() }).optional(),
});
export type CharacterLanguages = z.output<typeof CharacterLanguages>;

function sheetLanguage({ language, source, from, slot }: KnownLanguage): SheetLanguage {
  return {
    id: language.id,
    name: language.name,
    source,
    ...(from === undefined ? {} : { from: from.name }),
    ...(slot === undefined ? {} : { slot }),
  };
}

function nextSlot(slots: readonly LanguageSlot[], level: Level): CharacterLanguages['next'] {
  const next = slots.find((slot) => slot.level <= level && slot.pick === undefined);
  return next === undefined
    ? undefined
    : { slot: next.key, options: next.options.map(({ id, name }) => ({ id, name })) };
}

/** The character's languages as its sheet reads them, over the loaded content. */
export function characterLanguages(document: CharacterDocument, content: SlotContent): CharacterLanguages {
  const reads = languageReads(document, content);
  const level = Level.parse(document.level);
  const { slots, known } = languagesOf(document, reads);
  const next = nextSlot(slots, level);
  return {
    known: known.map((each) => sheetLanguage(each)),
    open: openLanguageSlots(slots, level),
    ...(next === undefined ? {} : { next }),
  };
}

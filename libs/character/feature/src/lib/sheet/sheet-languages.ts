import type { CharacterLanguages } from '@pioneer/character/domain';
import type { SlotKey } from '@pioneer/rules/sdk';
import type { LanguageLine } from '@pioneer/rules/ui';

import type { OfferedLanguage } from '../data/language-rows';

/** The Languages section: what the character knows, and Add language's slot and options while any are left to add. */
export interface SheetLanguages {
  readonly lines: ReadonlyArray<LanguageLine>;
  /** How many languages are left to add at the character's level. */
  readonly open: number;
  /** The slot Add language fills; undefined when every slot up to the character's level is filled. */
  readonly next: SlotKey | undefined;
  /** What it offers, by id and name; the table adds the facts to choose by. */
  readonly options: ReadonlyArray<OfferedLanguage>;
}

/** The server's reading of the character's languages, as the Languages section shows them. */
export function sheetLanguages({ known, open, next }: CharacterLanguages): SheetLanguages {
  return {
    lines: known.map(({ id, name, from, slot }): LanguageLine => {
      const base: LanguageLine = { key: id, name };
      const sourced: LanguageLine = from === undefined ? base : { ...base, from };

      return slot === undefined ? sourced : { ...sourced, slot };
    }),
    open,
    next: next?.slot,
    options: (next?.options ?? []).map(({ id, name }) => ({ id, name })),
  };
}

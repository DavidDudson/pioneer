import type { CharacterLanguages } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';
import type { LanguageLine } from '@pioneer/rules/ui';

/** The Languages section: what the character knows, and Add language's slot and options while any are left to add. */
export interface SheetLanguages {
  readonly lines: readonly LanguageLine[];
  /** How many languages are left to add at the character's level. */
  readonly open: number;
  /** The slot Add language fills; undefined when every slot up to the character's level is filled. */
  readonly next: SlotKey | undefined;
  readonly options: readonly SelectOption<string>[];
}

/** The server's reading of the character's languages, as the Languages section shows them. */
export function sheetLanguages({ known, open, next }: CharacterLanguages): SheetLanguages {
  return {
    lines: known.map(({ id, name, from, slot }) => ({
      key: id,
      name,
      ...(from === undefined ? {} : { from }),
      ...(slot === undefined ? {} : { slot }),
    })),
    open,
    next: next?.slot,
    options: (next?.options ?? []).map(({ id, name }) => ({ value: id, label: name })),
  };
}

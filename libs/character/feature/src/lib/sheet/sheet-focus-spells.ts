import { characterFocus, characterGrants, characterSpellcasting } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { SpellListMessage } from '@pioneer/rules/ui';
import type { FocusLine, SpellDetailLine, Translate } from '@pioneer/rules/ui';

import { sheetSlotContent } from './sheet-slot-content';
import { sheetSpellDetail } from './sheet-spell-details';
import { spellUse } from './sheet-spell-use';
import type { SpellSpend } from './sheet-spell-use';

/** What a focus line is worded and made castable with: the words of its details, and what casting is checked against. */
export interface FocusWords {
  readonly translate?: Translate | undefined;
  readonly spend?: SpellSpend | undefined;
}

/**
 * The character's focus spells as the sheet lists them (ADR-0050): each focus entry's spells by name, the rank they
 * are cast at and the focus pool; undefined for a character with no focus entry. With `translate` each spell also
 * carries what casting it takes and does at the focus rank (#484), and with `spend` what casting it spends (#355). `registry` must hold the spells, or every entry reads
 * as having none.
 */
export function sheetFocus(
  registry: ContentRegistry,
  character: Character,
  { translate, spend }: FocusWords = {},
): FocusLine | undefined {
  const content = sheetSlotContent(registry);
  const entries = characterSpellcasting(characterGrants(character.document, content));
  const focus = characterFocus(entries, content.spells, character.document.level);
  if (focus.entries.length === 0) {
    return undefined;
  }
  return {
    rank: focus.rank,
    pool: focus.pool,
    entries: focus.entries.map(({ entry, spells }) => ({
      key: entry.slug,
      tradition: entry.tradition,
      spells: spells.map(({ id, name, cantrip }) => {
        const option = content.spells.anySpell(id);
        const use =
          spend === undefined || option === undefined
            ? undefined
            : spellUse(option, { focus: cantrip ? undefined : true }, spend);
        const detail: SpellDetailLine | undefined =
          translate === undefined
            ? undefined
            : sheetSpellDetail(
                registry,
                {
                  id,
                  name,
                  rank: focus.rank,
                  tags: [cantrip ? SpellListMessage.TagCantrip : SpellListMessage.TagFocus],
                },
                translate,
              );
        return { key: id, id, name, cantrip, detail, use };
      }),
    })),
  };
}

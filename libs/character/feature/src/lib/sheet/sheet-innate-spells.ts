import { characterGrants, characterInnate, characterSpellcasting } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { SpellListMessage } from '@pioneer/rules/ui';
import type { InnateLine, SpellDetailLine, Translate } from '@pioneer/rules/ui';

import { sheetSlotContent } from './sheet-slot-content';
import { sheetSpellDetail } from './sheet-spell-details';

/**
 * The character's innate spells as the sheet lists them (ADR-0067): each innate entry's spells by name and the rank
 * each is cast at; undefined for a character with no innate entry. With `translate` each spell also carries what casting
 * it takes and does at that rank. `registry` must hold the spells, or every entry reads as having none.
 */
export function sheetInnate(
  registry: ContentRegistry,
  character: Character,
  translate?: Translate,
): InnateLine | undefined {
  const content = sheetSlotContent(registry);
  const entries = characterSpellcasting(characterGrants(character.document, content));
  const innate = characterInnate(entries, content.spells, character.document.level);
  if (innate.length === 0) {
    return undefined;
  }
  return {
    entries: innate.map(({ entry, spells }) => ({
      key: entry.slug,
      tradition: entry.tradition,
      spells: spells.map(({ spell: { id, name, cantrip }, rank }) => {
        const detail: SpellDetailLine | undefined =
          translate === undefined
            ? undefined
            : sheetSpellDetail(
                registry,
                { id, name, rank, tags: [cantrip ? SpellListMessage.TagCantrip : SpellListMessage.TagInnate] },
                translate,
              );
        return { key: id, id, name, cantrip, detail, rank };
      }),
    })),
  };
}

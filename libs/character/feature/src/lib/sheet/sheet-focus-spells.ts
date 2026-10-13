import { characterFocus, characterGrants, characterSpellcasting } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { FocusLine } from '@pioneer/rules/ui';

import { sheetSlotContent } from './sheet-slot-content';

/**
 * The character's focus spells as the sheet lists them (ADR-0050): each focus entry's spells by name, the rank they
 * are cast at and the focus pool; undefined for a character with no focus entry. `registry` must hold the spells, or
 * every entry reads as having none.
 */
export function sheetFocus(registry: ContentRegistry, character: Character): FocusLine | undefined {
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
      spells: spells.map(({ id, name, cantrip }) => ({ key: id, id, name, cantrip })),
    })),
  };
}

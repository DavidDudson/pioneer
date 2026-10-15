import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  spellContent,
  StaffSpellProblem,
  staffSources,
} from '@pioneer/character/domain';
import type { Character, StaffCharges, StaffSource } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { StaffSpellBlock } from '@pioneer/rules/ui';
import type { StaffLine, StaffSpellLine } from '@pioneer/rules/ui';

import { sheetSlotContent } from './sheet-slot-content';

/** What stops a spell of a staff being cast, as the list words it. */
const BLOCKS: Readonly<Record<StaffSpellProblem, StaffSpellBlock>> = {
  [StaffSpellProblem.NotOnList]: StaffSpellBlock.NotOnList,
  [StaffSpellProblem.RankTooHigh]: StaffSpellBlock.RankTooHigh,
};

/** The staves the character holds as the spell list shows them: a section each, with the charges left. */
export function sheetStaves(registry: ContentRegistry, character: Character, charges: StaffCharges): StaffLine[] {
  const entries = characterSpellcasting(characterGrants(character.document, sheetSlotContent(registry)));
  const items = itemContent(registry);
  return staffSources({
    inventory: character.document.inventory.items,
    items,
    spells: spellContent(registry),
    entries,
    charges,
  }).map((source): StaffLine => lineOf(source, items.get(source.item.item)?.name));
}

function lineOf({ item, spells, charges }: StaffSource, contentName: string | undefined): StaffLine {
  return {
    key: item.id,
    name: item.name ?? contentName ?? item.item,
    charges,
    spells: spells.map(({ id, spell, rank, charges: cost, problem }): StaffSpellLine => ({
      key: id,
      id,
      name: spell?.name ?? id,
      rank,
      charges: cost,
      blocked: problem === undefined ? undefined : BLOCKS[problem],
    })),
  };
}

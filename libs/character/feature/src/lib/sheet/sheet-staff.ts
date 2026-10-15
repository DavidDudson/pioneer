import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  staffLimits,
  staffSlotKey,
} from '@pioneer/character/domain';
import type { Character, InventoryItemId, SlotCountKey, StaffLimits, StaffSlot } from '@pioneer/character/domain';
import { SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentRegistry, SpellRank } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** A staff the character can prepare, by the name it is shown under. */
export interface StaffOption {
  readonly id: InventoryItemId;
  readonly name: string;
}

/** A slot of a prepared entry the character can expend for charges. */
export interface StaffSlotOption {
  readonly key: SlotCountKey;
  readonly slot: StaffSlot;
  /** The name of the entry that gave the spellcasting. */
  readonly source: string;
  readonly rank: SpellRank;
}

/** The staves, highest spell rank and expendable slots of the character, as daily preparations reads them. */
export function sheetStaffLimits(registry: ContentRegistry, character: Character): StaffLimits {
  const grants = characterGrants(character.document, sheetSlotContent(registry));
  return staffLimits(grants, character.document.inventory.items, itemContent(registry));
}

/** The staves daily preparations can prepare, named as the inventory names them. */
export function staffOptions(registry: ContentRegistry, character: Character, limits: StaffLimits): StaffOption[] {
  const entries = itemContent(registry);
  return character.document.inventory.items
    .filter(({ id }) => limits.staves.has(id))
    .map(({ id, item, name }) => ({ id, name: name ?? entries.get(item)?.name ?? item }));
}

/** The slots a prepared caster can expend, one per rank of each prepared entry. */
export function staffSlotOptions(registry: ContentRegistry, character: Character): StaffSlotOption[] {
  const content = sheetSlotContent(registry);
  const grants = characterGrants(character.document, content);
  return characterSpellcasting(grants)
    .filter(({ preparation }) => preparation === SpellPreparation.Prepared)
    .flatMap(({ slug, origin, slots }) =>
      slots.ranks.map(({ rank }): StaffSlotOption => {
        const slot: StaffSlot = { entry: slug, rank };
        return {
          key: staffSlotKey(slot),
          slot,
          source: content.lookup.entry(origin.entry)?.name ?? origin.entry,
          rank,
        };
      }),
    );
}

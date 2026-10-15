import type { GrantResolution } from '@pioneer/rules/grants';
import { SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { slotCountKey } from './counted-resources';
import type { SlotCountKey } from './counted-resources';
import type { InventoryItem, InventoryItemId } from './inventory';
import type { ItemContent } from './inventory-content';
import { CarryState } from './item-carry';
import { characterSpellcasting } from './spellcasting-build';
import type { StaffChoice, StaffSlot } from './staff-charges';
import { isStaff } from './staff-items';

/** What daily preparations reads to prepare a staff: the staves the character has and the spell ranks it casts. */
export interface StaffLimits {
  /** The inventory items that are staves and not dropped. */
  readonly staves: ReadonlySet<InventoryItemId>;
  /** The highest spell rank of the character's spellcasting entries, or undefined without spellcasting. */
  readonly highestRank: SpellRank | undefined;
  /** The slots a prepared caster may expend: the own slots of its prepared entries. */
  readonly expendable: ReadonlySet<SlotCountKey>;
}

/** No staves and no spellcasting, for a character that has none and for edits that don't read them. */
export const NO_STAFF: StaffLimits = { staves: new Set(), highestRank: undefined, expendable: new Set() };

/** The key of the slot a staff preparation expends. */
export function staffSlotKey({ entry, rank }: StaffSlot): SlotCountKey {
  return slotCountKey(entry, undefined, rank);
}

/**
 * The staves among `inventory`, the highest spell rank across the character's entries (pools included), and the slots
 * a prepared caster may expend (play-and-campaigns.md, "Staves and charged items").
 */
export function staffLimits(
  resolution: GrantResolution,
  inventory: readonly InventoryItem[],
  content: ItemContent,
): StaffLimits {
  const entries = characterSpellcasting(resolution);
  const ranks = entries.flatMap((entry) => [
    ...entry.slots.ranks.map(({ rank }) => rank),
    ...entry.pools.flatMap(({ ranks: pooled }) => pooled.map(({ rank }) => rank)),
  ]);
  return {
    staves: new Set(
      inventory.filter((item) => item.carry.state !== CarryState.Dropped && isStaff(item, content)).map(({ id }) => id),
    ),
    highestRank: ranks.length === 0 ? undefined : SpellRank.parse(Math.max(...ranks)),
    expendable: new Set(
      entries
        .filter(({ preparation }) => preparation === SpellPreparation.Prepared)
        .flatMap(({ slug, slots }) => slots.ranks.map(({ rank }) => slotCountKey(slug, undefined, rank))),
    ),
  };
}

/** Why a staff choice at daily preparations is refused. */
export const StaffProblem = {
  /** The item is no staff of the character's, or it was dropped. */
  NotAStaff: 'not-a-staff',
  /** A slot was named with no staff to add its charges to. */
  SlotWithoutStaff: 'slot-without-staff',
  /** Only the own slots of a prepared entry can be expended. */
  SlotNotExpendable: 'slot-not-expendable',
} as const;
export type StaffProblem = ValueOf<typeof StaffProblem>;

/** Why the staff and slot chosen can't be prepared, or undefined when they can. */
export function staffProblem({ staff, slot }: StaffChoice, limits: StaffLimits): StaffProblem | undefined {
  if (staff === undefined) {
    return slot === undefined ? undefined : StaffProblem.SlotWithoutStaff;
  }
  if (!limits.staves.has(staff)) {
    return StaffProblem.NotAStaff;
  }
  return slot === undefined || limits.expendable.has(staffSlotKey(slot)) ? undefined : StaffProblem.SlotNotExpendable;
}

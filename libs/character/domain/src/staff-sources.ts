import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { SpellPreparation, SpellRank, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { Charges, ContentId, StaffRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { InventoryItem } from './inventory';
import type { ItemContent } from './inventory-content';
import { CarryState } from './item-carry';
import type { ResourceCount } from './resource-count';
import type { SpellContent, SpellOption } from './spell-content';
import { chargesHeld } from './staff-charges';
import type { StaffCharges } from './staff-charges';
import { staffSpells } from './staff-items';
import type { StaffSpell } from './staff-items';

/** Why a spell a staff holds can't be cast by the holder. */
export const StaffSpellProblem = {
  /** None of the holder's spellcasting entries has the spell on its list, or the spell's content is not loaded. */
  NotOnList: 'not-on-list',
  /** An entry has the spell on its list, but casts no spell of its rank. */
  RankTooHigh: 'rank-too-high',
} as const;
export type StaffSpellProblem = ValueOf<typeof StaffSpellProblem>;

/** A spell a staff holds as its holder sees it: the rank it is listed under, its cost, and whether the holder can cast it. */
export interface StaffSourceSpell {
  readonly id: ContentId;
  /** The spell's content; undefined when it is not loaded. */
  readonly spell: SpellOption | undefined;
  readonly rank: StaffRank;
  readonly charges: Charges;
  /** The entry whose tradition lists the spell and casts its rank; undefined when the holder can't cast it. */
  readonly entry: SpellcastingInPlay | undefined;
  /** Why the holder can't cast it, or undefined when they can. */
  readonly problem: StaffSpellProblem | undefined;
}

/** The charges a prepared staff holds. */
export interface StaffSourceCharges {
  readonly left: ResourceCount;
  readonly max: ResourceCount;
}

/** A staff the character holds as a spell source: its spells by rank and the charges it has left. */
export interface StaffSource {
  readonly item: InventoryItem;
  readonly spells: readonly StaffSourceSpell[];
  /** The charges of the staff prepared for the day; undefined for a staff that is not the prepared one. */
  readonly charges: StaffSourceCharges | undefined;
}

/** The highest rank an entry casts: the ranks of its own slots and of its pools; undefined when it casts none. */
function highestRankOf(entry: SpellcastingInPlay): SpellRank | undefined {
  const ranks = [
    ...entry.slots.ranks.map(({ rank }) => rank),
    ...entry.pools.flatMap(({ ranks: pooled }) => pooled.map(({ rank }) => rank)),
  ];
  return ranks.length === 0 ? undefined : SpellRank.parse(Math.max(...ranks));
}

/** Whether `entry` can cast a spell listed at `rank`: a cantrip needs the list only, a ranked spell a slot of its rank. */
function castsRank(entry: SpellcastingInPlay, rank: StaffRank): boolean {
  if (rank === STAFF_CANTRIP) {
    return true;
  }
  const highest = highestRankOf(entry);
  return highest !== undefined && highest >= rank;
}

/** Why no entry casts the spell: none lists it, or those that do cast no spell of its rank. */
function problemOf(
  entry: SpellcastingInPlay | undefined,
  listing: readonly SpellcastingInPlay[],
): StaffSpellProblem | undefined {
  if (entry !== undefined) {
    return undefined;
  }
  return listing.length === 0 ? StaffSpellProblem.NotOnList : StaffSpellProblem.RankTooHigh;
}

function sourceSpell(
  { spell: id, rank, charges }: StaffSpell,
  content: SpellContent,
  entries: readonly SpellcastingInPlay[],
): StaffSourceSpell {
  const spell = content.anySpell(id);
  const listing = spell === undefined ? [] : entries.filter(({ tradition }) => spell.traditions.includes(tradition));
  const entry = listing.find((each) => castsRank(each, rank));
  return { id, spell, rank, charges, entry, problem: problemOf(entry, listing) };
}

/** What the staves are read from: the inventory and its content, the spells, the spellcasting entries and the charges. */
export interface StaffSourceInputs {
  readonly inventory: readonly InventoryItem[];
  readonly items: ItemContent;
  readonly spells: SpellContent;
  readonly entries: readonly SpellcastingInPlay[];
  readonly charges: StaffCharges;
}

/**
 * The staves the character holds as spell sources (play-and-campaigns.md, "Staves and charged items"): each worn or
 * held staff with its spells by rank, what each costs, and whether the holder can cast it. A staff that is stowed or
 * dropped is no source. A spell is castable when a spellcasting entry's tradition lists it and the entry casts spells of
 * its rank, a cantrip needing the list only; focus entries have no spell list to cast from and are left out. The
 * charges are the prepared staff's, and undefined for any other.
 */
export function staffSources({
  inventory,
  items,
  spells,
  entries,
  charges,
}: StaffSourceInputs): readonly StaffSource[] {
  const casters = entries.filter(({ preparation }) => preparation !== SpellPreparation.Focus);
  return inventory.flatMap((item): StaffSource[] => {
    if (item.carry.state !== CarryState.Worn && item.carry.state !== CarryState.Held) {
      return [];
    }
    const held = staffSpells(item, items);
    const prepared = charges[item.id];
    return held === undefined
      ? []
      : [
          {
            item,
            spells: held.map((each) => sourceSpell(each, spells, casters)),
            charges: prepared === undefined ? undefined : { left: chargesHeld(charges, item.id), max: prepared.max },
          },
        ];
  });
}

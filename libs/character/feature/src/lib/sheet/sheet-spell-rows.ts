import type { SpellOption } from '@pioneer/character/domain';
import type { ContentId, SpellRank } from '@pioneer/rules/sdk';
import type { SpellPickerRow } from '@pioneer/rules/ui';

/** What a spell picker words its rows with, and what it disables. */
export interface SpellRowReads {
  readonly translate: (key: string) => string;
  /** The rank a slot casts its spells at; undefined where it casts at a range of ranks (a signature slot). */
  readonly castRank: SpellRank | undefined;
  /** The spells the entry holds in another slot already; a repertoire knows a spell once. */
  readonly taken: ReadonlySet<ContentId>;
}

/**
 * The rows of a spell picker: every spell the slot offers with the facts to choose by. A cantrip says the rank the slot
 * heightens it to, and a spell the slot casts above its own rank says so. One the entry holds in another slot can't be
 * picked again, and says why.
 */
export function spellRows(
  spells: readonly SpellOption[],
  { translate, castRank, taken }: SpellRowReads,
): readonly SpellPickerRow[] {
  return spells.map((spell): SpellPickerRow => ({
    id: spell.id,
    name: spell.name,
    rank: spell.rank,
    cantrip: spell.cantrip,
    heightenedTo: castRank !== undefined && (spell.cantrip || castRank > spell.rank) ? castRank : undefined,
    traditions: spell.traditions,
    rarity: spell.rarity,
    cast: spell.cast,
    range: spell.range,
    area: spell.area,
    targets: spell.targets,
    defense: spell.defense,
    duration: spell.duration,
    traits: spell.traits,
    sources: spell.sources,
    disabledReason: taken.has(spell.id) ? translate('character.sheet.prepared.alreadyKnown') : undefined,
  }));
}

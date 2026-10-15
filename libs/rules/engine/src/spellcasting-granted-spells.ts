import { SLOT_COUNT_MAX, SlotCount } from '@pioneer/rules/sdk';
import type { GrantedSpell, RepertoireCountElement, RepertoireSpellsElement, Slug } from '@pioneer/rules/sdk';

import type { RankSlots } from './spellcasting-in-play';

/** Adds the spells of a `RepertoireSpells` element to those gathered for its entry, each rank and spell once. */
export function addGrantedSpells(
  gathered: Map<Slug, GrantedSpell[]>,
  { entry, spells }: RepertoireSpellsElement,
): void {
  const known = gathered.get(entry) ?? [];
  const fresh = spells.filter(
    (spell) => !known.some(({ rank, spell: id }) => rank === spell.rank && id === spell.spell),
  );
  gathered.set(entry, [...known, ...fresh]);
}

/** Adds the count of a `RepertoireCount` element to those gathered for its entry, added up per rank, lowest first. */
export function addRepertoireCount(
  gathered: Map<Slug, RankSlots[]>,
  { entry, rank, value }: RepertoireCountElement,
): void {
  const known = gathered.get(entry) ?? [];
  const before = known.find((counted) => counted.rank === rank)?.count ?? 0;
  const count = SlotCount.parse(Math.min(before + value, SLOT_COUNT_MAX));
  const others = known.filter((counted) => counted.rank !== rank);
  gathered.set(
    entry,
    [...others, { rank, count }].toSorted((left, right) => left.rank - right.rank),
  );
}

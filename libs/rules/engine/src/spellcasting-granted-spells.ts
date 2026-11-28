import { SLOT_COUNT_MAX, SlotCount } from '@pioneer/rules/sdk';
import type {
  GrantedSpell,
  RepertoireCountElement,
  RepertoireDeitySpellsElement,
  RepertoireSpellsElement,
  RuleSlug,
  Slug,
} from '@pioneer/rules/sdk';

import type { RankSlots } from './spellcasting-in-play';

/** The spells of `spells` that `known` lacks, each rank and spell once, in order. */
export function freshSpells(
  known: ReadonlyArray<GrantedSpell>,
  spells: ReadonlyArray<GrantedSpell>,
): ReadonlyArray<GrantedSpell> {
  const held = new Map<GrantedSpell['rank'], Set<GrantedSpell['spell']>>();

  for (const { rank, spell } of known) {
    held.set(rank, (held.get(rank) ?? new Set()).add(spell));
  }

  return spells.filter(({ rank, spell }) => held.get(rank)?.has(spell) !== true);
}

/** Adds the spells of a `RepertoireSpells` element to those gathered for its entry, each rank and spell once. */
export function addGrantedSpells(
  gathered: Map<Slug, Array<GrantedSpell>>,
  { entry, spells }: RepertoireSpellsElement,
): void {
  const known = gathered.get(entry) ?? [];
  gathered.set(entry, [...known, ...freshSpells(known, spells)]);
}

/** The deity spells a `RepertoireDeitySpells` element lets an entry add: how many, from the deity a choice stored. */
export interface DeityRepertoire {
  readonly choice: RuleSlug;
  readonly value: SlotCount;
}

/** Adds a `RepertoireDeitySpells` element to those gathered for its entry. */
export function addDeityRepertoire(
  gathered: Map<Slug, Array<DeityRepertoire>>,
  { entry, choice, value }: RepertoireDeitySpellsElement,
): void {
  gathered.set(entry, [...(gathered.get(entry) ?? []), { choice, value }]);
}

/** Adds the count of a `RepertoireCount` element to those gathered for its entry, added up per rank, lowest first. */
export function addRepertoireCount(
  gathered: Map<Slug, Array<RankSlots>>,
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

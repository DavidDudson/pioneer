import type { GrantedSpell, RepertoireSpellsElement, Slug } from '@pioneer/rules/sdk';

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

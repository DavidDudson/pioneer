import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { ContentId, SlotKey, SPELL_RANK_MAX, SpellRank } from '@pioneer/rules/sdk';

import type { PreparedReads, SlotHome, SlotPlace } from './prepared-spells';

/** The highest rank below 10th an entry has slots of: the highest a deity spell can be learned at, if it has any. */
function highestRank({ slots }: SpellcastingInPlay): SpellRank | undefined {
  const ranks = slots.ranks.map(({ rank }) => rank).filter((rank) => rank < SPELL_RANK_MAX);
  return ranks.length === 0 ? undefined : SpellRank.parse(Math.max(...ranks));
}

/**
 * The repertoire slots a spontaneous entry's `RepertoireDeitySpells` elements give (ADR-0063): up to as many as each
 * names, keyed `repertoire:<entry>:<choice>:<n>`, taking the spells the deity the choice stored grants. None while the
 * choice is unanswered, the deity grants no spells or the entry has no slots yet. The rank a slot is read at is its
 * highest until it holds a spell, then the spell's own.
 */
export function deityRepertoirePlaces(
  entry: SpellcastingInPlay,
  home: SlotHome,
  { resolution, lookup }: PreparedReads,
): SlotPlace[] {
  const rank = highestRank(entry);
  if (rank === undefined) {
    return [];
  }
  return entry.deityRepertoire.flatMap(({ choice, value }) => {
    const pick = resolution.answered.find((answered) => answered.flag === choice)?.pick;
    const deity = ContentId.safeParse(pick);
    const granted = deity.success ? (lookup.entry(deity.data)?.deitySpells ?? []) : [];
    const takes = new Set(granted.map(({ spell }) => spell));
    if (takes.size === 0) {
      return [];
    }
    return Array.from({ length: value }, (_unused, index) => ({
      ...home,
      takes,
      floating: true,
      key: SlotKey.parse(`repertoire:${entry.slug}:${choice}:${index}`),
      rank,
      gift: undefined,
    }));
  });
}

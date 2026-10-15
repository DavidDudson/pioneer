import type { RankSlots, SpellSlots } from '@pioneer/rules/engine';
import { SLOT_COUNT_MAX, SlotCount, SPELL_RANK_MAX } from '@pioneer/rules/sdk';
import type { SpellRank } from '@pioneer/rules/sdk';

/**
 * The slots a spontaneous entry's repertoire has: one spell per slot of each rank below 10th, the counts of its
 * `RepertoireCount` elements besides, and at 10th rank those counts alone, as its slots never size it (ADR-0063).
 */
export function repertoireSlots(slots: SpellSlots, counts: readonly RankSlots[]): SpellSlots {
  const sized = new Map<SpellRank, number>();
  for (const { rank, count } of slots.ranks) {
    if (rank < SPELL_RANK_MAX) {
      sized.set(rank, count);
    }
  }
  for (const { rank, count } of counts) {
    sized.set(rank, (sized.get(rank) ?? 0) + count);
  }
  const ranks = [...sized]
    .map(([rank, count]): RankSlots => ({ rank, count: SlotCount.parse(Math.min(count, SLOT_COUNT_MAX)) }))
    .toSorted((left, right) => left.rank - right.rank);
  return slots.cantrips === undefined ? { ranks } : { cantrips: slots.cantrips, ranks };
}

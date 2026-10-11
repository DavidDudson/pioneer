import { Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { RuleElementKey, SLOT_COUNT_MAX, SlotCount, SlotRank, SpellRank } from '@pioneer/rules/sdk';
import type { Origin, RuleSlug, Slug, SpellPreparation, SpellSlotsElement } from '@pioneer/rules/sdk';

import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';
import type { SpellcastingInputs } from './source-inputs';

/** How many slots an entry or pool has of one rank. */
export interface RankSlots {
  readonly rank: SpellRank;
  readonly count: SlotCount;
}

/** Cantrips and spell slots by rank, lowest rank first; ranks with none are left out. */
export interface SpellSlots {
  /** Absent when there are none. */
  readonly cantrips?: SlotCount;
  readonly ranks: readonly RankSlots[];
}

/** Slots kept apart from an entry's own, because only some spells go in them: a divine font, a curriculum. */
export interface SlotPool extends SpellSlots {
  readonly pool: RuleSlug;
  /** The entry whose `SpellSlots` element first added to the pool, and how it got on the character. */
  readonly origin: Origin;
}

/** An entry's slots: its own, from its class's table or the feats that grant them, and its other pools. */
interface EntrySlots {
  readonly slots: SpellSlots;
  /** In pool order. */
  readonly pools: readonly SlotPool[];
}

/** An entry as its `SpellcastingEntry` element gives it, before its slots are counted. */
interface EntryInPlay extends SpellcastingInputs {
  readonly preparation: SpellPreparation;
  /** The entry whose `SpellcastingEntry` element gave it, and how that entry got on the character. */
  readonly origin: Origin;
}

/** A spellcasting entry on the character: what its spell attack and DC read, how it casts, why it is there, its slots. */
export interface SpellcastingInPlay extends EntryInPlay, EntrySlots {}

/** `items` in the code-unit order of their slugs, so a result never depends on the host's locale. */
function bySlug<Item>(items: readonly Item[], slugOf: (item: Item) => Slug): readonly Item[] {
  return items.toSorted((left, right) => {
    const [leftSlug, rightSlug] = [slugOf(left), slugOf(right)];
    if (leftSlug === rightSlug) {
      return 0;
    }
    return leftSlug < rightSlug ? -1 : 1;
  });
}

/** A rank a count is kept under once `highest` is resolved: cantrips, or 1 to 10. */
type CountedRank = SpellRank | typeof SlotRank.Cantrip;

/** Counts by rank as the elements add them up, each clamped to `SLOT_COUNT_MAX`. */
type Tally = Map<CountedRank, SlotCount>;

function add(tally: Tally, rank: CountedRank, value: SlotCount): void {
  const total = (tally.get(rank) ?? 0) + value;
  tally.set(rank, SlotCount.parse(Math.min(total, SLOT_COUNT_MAX)));
}

function slotsOf(tally: Tally): SpellSlots {
  const cantrips = tally.get(SlotRank.Cantrip);
  const ranks = [...tally]
    .flatMap(([rank, count]): RankSlots[] => (rank === SlotRank.Cantrip ? [] : [{ rank, count }]))
    .toSorted((left, right) => left.rank - right.rank);
  return cantrips === undefined ? { ranks } : { cantrips, ranks };
}

function highestRank(tally: Tally): SpellRank | undefined {
  const ranks = [...tally.keys()].filter((rank) => rank !== SlotRank.Cantrip);
  return ranks.length === 0 ? undefined : SpellRank.parse(Math.max(...ranks));
}

interface PlacedSlots {
  readonly element: SpellSlotsElement;
  readonly origin: Origin;
}

interface PoolTally {
  readonly origin: Origin;
  readonly tally: Tally;
}

/** The entry's own slots of a fixed rank and its cantrips, counted before `highest` is known. */
function fixedOwnSlots(placed: readonly PlacedSlots[]): Tally {
  const own: Tally = new Map();
  for (const { element } of placed) {
    if (element.pool === undefined && element.rank !== SlotRank.Highest) {
      add(own, element.rank, element.value);
    }
  }
  return own;
}

/**
 * An entry's own slots and pools from the `SpellSlots` elements that name it. Counts add up per pool and rank;
 * `highest` is the highest rank its own fixed slots reach, so it is read once those are counted, and adds nothing to an
 * entry with none.
 */
function entrySlots(placed: readonly PlacedSlots[]): EntrySlots {
  const own = fixedOwnSlots(placed);
  const highest = highestRank(own);
  const pools = new Map<RuleSlug, PoolTally>();
  for (const { element, origin } of placed) {
    const rank = element.rank === SlotRank.Highest ? highest : element.rank;
    if (rank !== undefined && element.pool !== undefined) {
      const pool = pools.get(element.pool) ?? { origin, tally: new Map() };
      add(pool.tally, rank, element.value);
      pools.set(element.pool, pool);
    } else if (highest !== undefined && element.pool === undefined && element.rank === SlotRank.Highest) {
      add(own, highest, element.value);
    }
  }
  return {
    slots: slotsOf(own),
    pools: bySlug(
      [...pools].map(([pool, { origin, tally }]): SlotPool => Object.assign(slotsOf(tally), { pool, origin })),
      ({ pool }) => pool,
    ),
  };
}

function holds(rule: RuleInPlay, facts: PredicateFacts): boolean {
  return truthOf(rule.element.predicate, facts) === Truth.True;
}

/**
 * The spellcasting entries the `SpellcastingEntry` elements in play give (ADR-0040): one per slug, from the first
 * element with that slug whose predicate holds, in slug order. One that depends on the situation gives none on the
 * sheet. Each is a source `StatisticInputs.spellcasting` derives a spell attack and DC for, with the slots the
 * `SpellSlots` elements in play give it (ADR-0041).
 */
export function spellcastingInPlay({ rules, facts }: ModifierInputs): readonly SpellcastingInPlay[] {
  const entries = new Map<Slug, EntryInPlay>();
  const slots = new Map<Slug, PlacedSlots[]>();
  for (const rule of rules) {
    const { element, origin } = rule;
    if (element.key === RuleElementKey.SpellcastingEntry && !entries.has(element.slug) && holds(rule, facts)) {
      const { slug, tradition, attribute, preparation } = element;
      entries.set(slug, { slug, tradition, attribute, preparation, origin });
    }
    if (element.key === RuleElementKey.SpellSlots && holds(rule, facts)) {
      slots.set(element.entry, [...(slots.get(element.entry) ?? []), { element, origin }]);
    }
  }
  return bySlug(
    [...entries.values()].map((entry): SpellcastingInPlay =>
      Object.assign(entrySlots(slots.get(entry.slug) ?? []), entry),
    ),
    ({ slug }) => slug,
  );
}

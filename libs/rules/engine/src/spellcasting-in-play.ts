import { Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import {
  RuleElementKey,
  SLOT_COUNT_MAX,
  SlotCount,
  SlotRank,
  SPELL_RANK_MAX,
  SpellPreparation,
  SpellRank,
} from '@pioneer/rules/sdk';
import type {
  ContentId,
  Origin,
  FocusSpellsElement,
  GrantedSpell,
  PoolSpellsElement,
  RuleElement,
  RuleSlug,
  Slug,
  SpellSlotsElement,
} from '@pioneer/rules/sdk';

import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';
import type { SpellcastingInputs } from './source-inputs';
import { addGrantedSpells } from './spellcasting-granted-spells';

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
  /** The spells its slots take, from the `PoolSpells` elements in play for it, each once in the order they name them. */
  readonly spells: readonly ContentId[];
}

/** An entry's slots: its own, from its class's table or the feats that grant them, and its other pools. */
interface EntrySlots {
  readonly slots: SpellSlots;
  /** In pool order. */
  readonly pools: readonly SlotPool[];
}

/** Whether a `SignatureSpells` element in play names the entry (ADR-0047). */
interface EntrySignatures {
  readonly signatures: boolean;
}

/** The focus spells the `FocusSpells` elements in play give a focus entry, each once in the order they name them; none
 * for any other entry (ADR-0050). */
interface EntryFocusSpells {
  readonly focusSpells: readonly ContentId[];
}

/** The spells the `RepertoireSpells` elements in play give a spontaneous entry, each once; none for another (ADR-0062). */
interface EntryGrantedSpells {
  readonly grantedSpells: readonly GrantedSpell[];
}

/** An entry as its `SpellcastingEntry` element gives it, before its slots are counted. */
interface EntryInPlay extends SpellcastingInputs {
  readonly preparation: SpellPreparation;
  /** The entry whose `SpellcastingEntry` element gave it, and how that entry got on the character. */
  readonly origin: Origin;
}

/**
 * A spellcasting entry on the character: what its spell attack and DC read, how it casts, why it is there, and its
 * slots.
 */
export interface SpellcastingInPlay
  extends EntryInPlay, EntrySlots, EntrySignatures, EntryFocusSpells, EntryGrantedSpells {
  /** Whether a `DeitySpells` element in play adds the character's deity's spells to its list (ADR-0048). */
  readonly deitySpells: boolean;
}

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

/**
 * The highest rank of the entry's own slots that abilities giving more slots can use: 10th-rank slots never count
 * (Player Core: "you can't use 10th-rank slots with abilities that give you more spell slots").
 */
function highestRank(tally: Tally): SpellRank | undefined {
  const ranks = [...tally.keys()]
    .filter((rank): rank is SpellRank => rank !== SlotRank.Cantrip)
    .filter((rank) => rank < SPELL_RANK_MAX);
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

/** The spells each of an entry's pools takes, by pool. */
type PoolSpells = ReadonlyMap<RuleSlug, readonly ContentId[]>;

const NO_POOL_SPELLS: PoolSpells = new Map();

/**
 * An entry's own slots and pools from the `SpellSlots` elements that name it, each pool with the spells `poolSpells`
 * gives it. Counts add up per pool and rank; `highest` is the highest rank below 10th its own fixed slots reach, so it
 * is read once those are counted, and adds nothing to an entry with none.
 */
function entrySlots(placed: readonly PlacedSlots[], poolSpells: PoolSpells): EntrySlots {
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
      [...pools].map(([pool, { origin, tally }]): SlotPool =>
        Object.assign(slotsOf(tally), { pool, origin, spells: poolSpells.get(pool) ?? [] }),
      ),
      ({ pool }) => pool,
    ),
  };
}

function holds(rule: RuleInPlay, facts: PredicateFacts): boolean {
  return truthOf(rule.element.predicate, facts) === Truth.True;
}

/** What the rules in play give, by entry slug, as `spellcastingInPlay` reads them. */
interface Gathered {
  readonly entries: Map<Slug, EntryInPlay>;
  readonly slots: Map<Slug, PlacedSlots[]>;
  readonly poolSpells: Map<Slug, Map<RuleSlug, ContentId[]>>;
  /** The entries a `DeitySpells` element names. */
  readonly deitySpells: Set<Slug>;
  /** The entries a `SignatureSpells` element names. */
  readonly signatures: Set<Slug>;
  /** The spells the `FocusSpells` elements give, by the entry they name. */
  readonly focusSpells: Map<Slug, ContentId[]>;
  /** The spells the `RepertoireSpells` elements give, by the entry they name. */
  readonly grantedSpells: Map<Slug, GrantedSpell[]>;
}

/** Adds `spells` to what `pool` of `entry` takes, each spell once. */
function addPoolSpells({ poolSpells }: Gathered, { entry, pool, spells }: PoolSpellsElement): void {
  const pools = poolSpells.get(entry) ?? new Map<RuleSlug, ContentId[]>();
  const taken = pools.get(pool) ?? [];
  pools.set(pool, [...taken, ...spells.filter((spell) => !taken.includes(spell))]);
  poolSpells.set(entry, pools);
}

/** Adds `spells` to the focus spells of `entry`, each spell once. */
function addFocusSpells({ focusSpells }: Gathered, { entry, spells }: FocusSpellsElement): void {
  const known = focusSpells.get(entry) ?? [];
  focusSpells.set(entry, [...known, ...spells.filter((spell) => !known.includes(spell))]);
}

/** Adds the spells an element names an entry: its pool spells, deity spells, signature spells or focus spells. */
function gatherSpells(gathered: Gathered, element: RuleElement): void {
  if (element.key === RuleElementKey.PoolSpells) {
    addPoolSpells(gathered, element);
  }
  if (element.key === RuleElementKey.DeitySpells) {
    gathered.deitySpells.add(element.entry);
  }
  if (element.key === RuleElementKey.SignatureSpells) {
    gathered.signatures.add(element.entry);
  }
  if (element.key === RuleElementKey.FocusSpells) {
    addFocusSpells(gathered, element);
  }
  if (element.key === RuleElementKey.RepertoireSpells) {
    addGrantedSpells(gathered.grantedSpells, element);
  }
}

/**
 * Adds what one rule in play gives, if it holds: an entry the first time its slug holds, slots, pool spells, the
 * entries deity or signature spells name, or focus spells.
 */
function gather(gathered: Gathered, rule: RuleInPlay, facts: PredicateFacts): void {
  const { element, origin } = rule;
  if (!holds(rule, facts)) {
    return;
  }
  if (element.key === RuleElementKey.SpellcastingEntry && !gathered.entries.has(element.slug)) {
    const { slug, tradition, attribute, preparation } = element;
    gathered.entries.set(slug, { slug, tradition, attribute, preparation, origin });
  }
  if (element.key === RuleElementKey.SpellSlots) {
    gathered.slots.set(element.entry, [...(gathered.slots.get(element.entry) ?? []), { element, origin }]);
  }
  gatherSpells(gathered, element);
}

/**
 * The spellcasting entries the `SpellcastingEntry` elements in play give (ADR-0040): one per slug, from the first
 * element with that slug whose predicate holds, in slug order. One that depends on the situation gives none on the
 * sheet. Each is a source `StatisticInputs.spellcasting` derives a spell attack and DC for, with the slots the
 * `SpellSlots` elements in play give it (ADR-0041) and the spells the `PoolSpells` elements in play give its pools
 * (ADR-0045), and whether a `DeitySpells` element in play adds the deity's spells to its list (ADR-0048). A spontaneous
 * entry a `SignatureSpells` element in play names has signature spells (ADR-0047); a prepared or innate one never does.
 * A focus entry has the spells the `FocusSpells` elements in play name it (ADR-0050); any other entry has none. A spontaneous entry's repertoire spells are those of its `RepertoireSpells` elements (ADR-0062).
 */
export function spellcastingInPlay({ rules, facts }: ModifierInputs): readonly SpellcastingInPlay[] {
  const gathered: Gathered = {
    entries: new Map(),
    slots: new Map(),
    poolSpells: new Map(),
    deitySpells: new Set(),
    signatures: new Set(),
    focusSpells: new Map(),
    grantedSpells: new Map(),
  };
  for (const rule of rules) {
    gather(gathered, rule, facts);
  }
  const { entries, slots, poolSpells, deitySpells, signatures, focusSpells, grantedSpells } = gathered;
  return bySlug(
    [...entries.values()].map((entry): SpellcastingInPlay => {
      const spontaneous = entry.preparation === SpellPreparation.Spontaneous;
      const counted = entrySlots(slots.get(entry.slug) ?? [], poolSpells.get(entry.slug) ?? NO_POOL_SPELLS);
      const focus = entry.preparation === SpellPreparation.Focus ? (focusSpells.get(entry.slug) ?? []) : [];
      return Object.assign(counted, entry, {
        deitySpells: deitySpells.has(entry.slug),
        signatures: spontaneous && signatures.has(entry.slug),
        focusSpells: focus,
        grantedSpells: spontaneous ? (grantedSpells.get(entry.slug) ?? []) : [],
      });
    }),
    ({ slug }) => slug,
  );
}

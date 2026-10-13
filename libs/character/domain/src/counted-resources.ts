import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { FrequencyPeriod } from '@pioneer/rules/sdk';
import type { Activation, ContentId, Frequency, RuleSlug, Slug, SpellRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { InventoryItem, InventoryItemId } from './inventory';
import { ResourceCount } from './resource-count';

/** The longest key a spent count is stored under: a slot's `<entry>:<pool>:<rank>`, an activation's `<item>:<slug>`. */
const COUNT_KEY_MAX_LENGTH = 200;

const NONE = ResourceCount.parse(0);

/**
 * Which slots of an entry a count is for: `<entry>:<rank>` for the entry's own, `<entry>:<pool>:<rank>` for one of its
 * pools (a divine font). Cantrips have no key, since they are not spent.
 */
export const SlotCountKey = z.string().min(1).max(COUNT_KEY_MAX_LENGTH).brand<'SlotCountKey'>();
export type SlotCountKey = z.infer<typeof SlotCountKey>;

/**
 * What a use is counted under: a feat or action with a `frequency` by its content id, an item activation by the
 * inventory item it is on and its slug (`<item>:<slug>`), since each item of a character is used up on its own.
 */
export const UseCountKey = z.string().min(1).max(COUNT_KEY_MAX_LENGTH).brand<'UseCountKey'>();
export type UseCountKey = z.infer<typeof UseCountKey>;

/** A key a count is kept under. */
type CountKey = SlotCountKey | UseCountKey;

/** The spell slots and ability uses spent, as inputs: what is held is the maximum less what is spent. */
export const SpentCountsSchema = z.strictObject({
  slots: z.partialRecord(SlotCountKey, ResourceCount).default({}),
  uses: z.partialRecord(UseCountKey, ResourceCount).default({}),
});
export type SpentCounts = z.infer<typeof SpentCountsSchema>;

/**
 * The point at which a counted resource comes back, so the actions that restore resources read it instead of knowing
 * each resource: spell slots on `day` (daily preparations), a turn or round frequency on its own, a frequency of a
 * minute to an hour on `rest`, and a frequency of 24 hours or more only by hand.
 */
export const Boundary = {
  Round: 'round',
  Turn: 'turn',
  Rest: 'rest',
  Day: 'day',
  Session: 'session',
  /** Comes back only when the player resets it. */
  Manual: 'manual',
} as const;
export type Boundary = ValueOf<typeof Boundary>;

/** What a counted resource holds at most, and the boundary it resets on. Derived, never stored. */
export interface CountedMaximum {
  readonly max: ResourceCount;
  readonly boundary: Boundary;
}

/** The maxima the build and the content give, by key. */
export interface CountedMaxima {
  readonly slots: ReadonlyMap<SlotCountKey, CountedMaximum>;
  readonly uses: ReadonlyMap<UseCountKey, CountedMaximum>;
}

/** No slots and no uses, for a character that has none and for edits that don't read them. */
export const NO_COUNTED: CountedMaxima = { slots: new Map(), uses: new Map() };

/** The key a feat or action with a frequency is counted under. */
export function abilityUseKey(id: ContentId): UseCountKey {
  return UseCountKey.parse(id);
}

/** The key the uses of an activation of one inventory item are counted under. */
export function activationUseKey(item: InventoryItemId, activation: Slug): UseCountKey {
  return UseCountKey.parse(`${item}:${activation}`);
}

/** The key the overcharged use of an activation of one inventory item is counted under, apart from its daily uses. */
export function overchargeUseKey(item: InventoryItemId, activation: Slug): UseCountKey {
  return UseCountKey.parse(`${item}:${activation}:overcharge`);
}

/** The key of the slots of `rank` in an entry, or in one of its pools. */
export function slotCountKey(entry: Slug, pool: RuleSlug | undefined, rank: SpellRank): SlotCountKey {
  return SlotCountKey.parse(pool === undefined ? `${entry}:${rank}` : `${entry}:${pool}:${rank}`);
}

const FREQUENCY_BOUNDARIES: Readonly<Record<FrequencyPeriod, Boundary>> = {
  [FrequencyPeriod.Turn]: Boundary.Turn,
  [FrequencyPeriod.Round]: Boundary.Round,
  [FrequencyPeriod.Minute]: Boundary.Rest,
  [FrequencyPeriod.TenMinutes]: Boundary.Rest,
  [FrequencyPeriod.Hour]: Boundary.Rest,
  [FrequencyPeriod.Day]: Boundary.Day,
  [FrequencyPeriod.TwentyFourHours]: Boundary.Manual,
  [FrequencyPeriod.Week]: Boundary.Manual,
  [FrequencyPeriod.Month]: Boundary.Manual,
  [FrequencyPeriod.Year]: Boundary.Manual,
};

/** The boundary uses of a `frequency` come back on. */
export function frequencyBoundary({ per }: Frequency): Boundary {
  return FREQUENCY_BOUNDARIES[per];
}

/** The slots of each entry and each of its pools, one maximum per rank that has any; cantrips are not counted. */
export function slotMaxima(entries: readonly SpellcastingInPlay[]): ReadonlyMap<SlotCountKey, CountedMaximum> {
  return new Map(
    entries.flatMap((entry) => [
      ...entry.slots.ranks.map(({ rank, count }): [SlotCountKey, CountedMaximum] => [
        slotCountKey(entry.slug, undefined, rank),
        { max: ResourceCount.parse(count), boundary: Boundary.Day },
      ]),
      ...entry.pools.flatMap((pool) =>
        pool.ranks.map(({ rank, count }): [SlotCountKey, CountedMaximum] => [
          slotCountKey(entry.slug, pool.pool, rank),
          { max: ResourceCount.parse(count), boundary: Boundary.Day },
        ]),
      ),
    ]),
  );
}

/** The uses of each feat or action the character has with a `frequency`. */
export function useMaxima(
  granted: readonly ContentId[],
  frequencyOf: (id: ContentId) => Frequency | undefined,
): ReadonlyMap<UseCountKey, CountedMaximum> {
  return new Map(
    granted.flatMap((id): [UseCountKey, CountedMaximum][] => {
      const frequency = frequencyOf(id);
      return frequency === undefined
        ? []
        : [[abilityUseKey(id), { max: ResourceCount.parse(frequency.max), boundary: frequencyBoundary(frequency) }]];
    }),
  );
}

/**
 * The uses of each activation with a frequency on the character's items, and one overcharged use apart from them for
 * an activation that can be overcharged. A line of several items has that many uses, since each one is used up on its
 * own.
 */
export function activationMaxima(
  items: readonly InventoryItem[],
  activationsOf: (id: ContentId) => readonly Activation[],
): ReadonlyMap<UseCountKey, CountedMaximum> {
  return new Map(
    items.flatMap(({ id, item, quantity }) =>
      activationsOf(item).flatMap(({ slug, frequency, overcharge }): [UseCountKey, CountedMaximum][] => {
        const boundary = frequencyBoundary(frequency);
        const daily: [UseCountKey, CountedMaximum] = [
          activationUseKey(id, slug),
          { max: ResourceCount.parse(frequency.max * quantity), boundary },
        ];
        return overcharge === true
          ? [daily, [overchargeUseKey(id, slug), { max: ResourceCount.parse(quantity), boundary }]]
          : [daily];
      }),
    ),
  );
}

/** The counts spent by key, of either kind. */
type SpentByKey<Key extends CountKey> = Readonly<Partial<Record<Key, ResourceCount>>>;

/** A change in the count spent: 1 to spend one, -1 to refund one. */
export const CountDelta = z.union([z.literal(1), z.literal(-1)]).brand<'CountDelta'>();
export type CountDelta = z.infer<typeof CountDelta>;

/** One count and the change to make to it. */
interface CountEdit<Key extends CountKey> {
  readonly spent: SpentByKey<Key>;
  readonly maxima: ReadonlyMap<Key, CountedMaximum>;
  readonly key: Key;
}

/** What `spent` holds of `key` against `maxima`: the maximum less what is spent, never below 0; 0 for an unknown key. */
export function heldCount<Key extends CountKey>({ spent, maxima, key }: CountEdit<Key>): ResourceCount {
  const max = maxima.get(key)?.max ?? NONE;
  return ResourceCount.parse(Math.max(max - (spent[key] ?? NONE), 0));
}

/**
 * The counts after one more is spent (`delta` 1) or refunded (-1) under the edit's key, held within 0 and the
 * maximum. A key with no maximum is left as it was, and a count back at 0 spent is dropped so the stored record stays
 * small.
 */
export function spentAfter<Key extends CountKey>(edit: CountEdit<Key>, delta: CountDelta): SpentByKey<Key> {
  const { spent, maxima, key } = edit;
  const known = maxima.get(key);
  if (known === undefined) {
    return spent;
  }
  const next = Math.min(Math.max((spent[key] ?? NONE) + delta, 0), known.max);
  const changed = { [key]: ResourceCount.parse(next) };
  const counts: Partial<Record<Key, ResourceCount>> = { ...spent, ...changed };
  return counts;
}

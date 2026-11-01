import {
  contentId,
  ContentKind,
  EntrySlug,
  entrySlug,
  PackId,
  Slug,
  StatisticDefinition,
  StatisticKind,
} from '@pioneer/rules/sdk';

import { RuleInPlay } from '../rule-in-play';

const TEST_PACK = PackId.parse('engine-test');
/** The user and time every test override is set by. */
const OVERRIDE_HOP = {
  kind: 'override',
  by: '00000000-0000-4000-8000-000000000001',
  at: '2026-01-01T00:00:00.000Z',
} as const;

/** A check statistic with no domains unless given. */
export function statistic(selector: string, base: string, domains: readonly string[] = []): StatisticDefinition {
  return StatisticDefinition.parse({
    slug: `statistic:${selector.replaceAll(':', '-')}`,
    name: selector,
    selector,
    domains,
    base,
    kind: StatisticKind.Check,
  });
}

/**
 * Where a rule element sits in its entry, the level of the item it is on, the value of the condition it is on, and
 * whether a user put it there.
 */
interface Placement {
  readonly rule?: number;
  readonly itemLevel?: number;
  readonly conditionValue?: number;
  /** An override: its origin gets an `override` hop. */
  readonly override?: boolean;
  /** The inventory item it comes from: its origin starts at a hop for it. */
  readonly item?: string;
}

/** The hop of an inventory item, held. */
function inventoryHop(item: string): object {
  return { kind: 'inventory', item, state: 'held' };
}

/** The origin hops of a placement: the override hop, the inventory item it comes from, or none. */
function hopsOf(override: boolean | undefined, item: string | undefined): readonly object[] {
  if (override === true) {
    return [OVERRIDE_HOP];
  }
  return item === undefined ? [] : [inventoryHop(item)];
}

/** A rule element on the test pack's entry named `entry`; ids are opaque to the engine, so every one is an effect. */
export function inPlay(
  element: unknown,
  entry: string,
  { rule = 0, itemLevel, conditionValue, override, item }: Placement = {},
): RuleInPlay {
  const slug = entrySlug(ContentKind.Effect, Slug.parse(entry));
  return RuleInPlay.parse({
    element,
    origin: {
      hops: hopsOf(override, item),
      entry: contentId(TEST_PACK, slug),
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
    rule,
    itemLevel,
    conditionValue,
  });
}

/** A `FlatModifier` as JSON: `value` of `type` on `selectors`. Spread it to add fields. */
export function flatModifier(type: string, value: number | string, selectors: readonly string[]): object {
  return { key: 'FlatModifier', type, value, selectors };
}

/** A `Change` as JSON: `mode` with `value` on `selector`. Spread it to add fields. */
export function change(selector: string, mode: string, value: number | string): object {
  return { key: 'Change', selector, mode, value };
}

/** A weapon's inputs as JSON, with its origin. */
type Wielded<Weapon> = Weapon & { readonly origin: object };

/** A weapon's inputs as JSON: `weapon` with an origin on the test pack's entry of the same slug. */
export function wielded<Weapon extends { readonly slug: string }>(weapon: Weapon, item?: string): Wielded<Weapon> {
  return {
    ...weapon,
    origin: {
      hops: item === undefined ? [] : [inventoryHop(item)],
      entry: contentId(TEST_PACK, EntrySlug.parse(`weapon:${weapon.slug}`)),
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
  };
}

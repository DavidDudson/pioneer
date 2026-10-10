import { contentId, PackId, Slug, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';

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
    slug: selector.replaceAll(':', '-'),
    name: selector,
    selector,
    domains,
    base,
    kind: StatisticKind.Check,
  });
}

/** Where a rule element sits in its entry, the level of the item it is on, and whether a user put it there. */
interface Placement {
  readonly rule?: number;
  readonly itemLevel?: number;
  /** An override: its origin gets an `override` hop. */
  readonly override?: boolean;
}

/** A rule element on the test pack's entry `entry`. */
export function inPlay(element: unknown, entry: string, { rule = 0, itemLevel, override }: Placement = {}): RuleInPlay {
  return RuleInPlay.parse({
    element,
    origin: {
      hops: override === true ? [OVERRIDE_HOP] : [],
      entry: contentId(TEST_PACK, Slug.parse(entry)),
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
    rule,
    itemLevel,
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

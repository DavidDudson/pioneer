import { contentId, PackId, Slug, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';

import { RuleInPlay } from '../rule-in-play';

const TEST_PACK = PackId.parse('engine-test');

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

/** Where a rule element sits in its entry, and the level of the item it is on, if any. */
interface Placement {
  readonly rule?: number;
  readonly itemLevel?: number;
}

/** A rule element on the test pack's entry `entry`. */
export function inPlay(element: unknown, entry: string, { rule = 0, itemLevel }: Placement = {}): RuleInPlay {
  return RuleInPlay.parse({
    element,
    origin: {
      hops: [],
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

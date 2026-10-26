import { RuleInPlay } from '@pioneer/rules/engine';
import type { GrantEntry, GrantResolution } from '@pioneer/rules/grants';
import { ContentKind, Level, OriginHopKind } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';

import type { Inventory } from './inventory';
import type { ItemContent } from './inventory-content';

/** An entry grants put in play, and why. */
export interface Resolved {
  readonly entry: GrantEntry;
  readonly origin: Origin;
}

/** What an entry's level is read from: the content, and the inventory a property rune's host item is found in. */
export interface EntryContext {
  readonly inventory: Inventory;
  readonly content: ItemContent;
}

/**
 * The level `@item.level` reads in an entry's rule elements: the item's own, or for a property rune the level of the
 * item it is etched onto, as Foundry pf2e keeps a rune's rules on that item.
 */
function itemLevelOf({ content, inventory }: EntryContext, { entry, origin }: Resolved): Level | undefined {
  const [hop] = origin.hops;
  if (hop?.kind === OriginHopKind.Effect && hop.rank !== undefined) {
    return Level.parse(hop.rank);
  }
  const host = hop?.kind === OriginHopKind.Inventory ? inventory.items.find((each) => each.id === hop.item) : undefined;
  const id = entry.kind === ContentKind.Rune && host !== undefined ? host.item : entry.id;
  const level = content.get(id)?.level;
  return level === undefined ? undefined : Level.parse(level);
}

/** The rule elements of the resolved entries whose origin `keep` accepts, each with its origin and place in the entry. */
export function rulesOf(
  resolution: GrantResolution,
  context: EntryContext,
  keep: (origin: Origin) => boolean,
): RuleInPlay[] {
  return resolution.items
    .filter(({ origin }) => keep(origin))
    .flatMap(({ entry, origin, value }) =>
      entry.rules.map((element, rule) =>
        RuleInPlay.parse({
          element,
          origin,
          rule,
          itemLevel: itemLevelOf(context, { entry, origin }),
          conditionValue: value,
        }),
      ),
    );
}

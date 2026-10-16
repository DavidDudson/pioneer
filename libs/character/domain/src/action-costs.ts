import { ContentKind } from '@pioneer/rules/sdk';
import type { ActionData, ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';

import { SpendCount } from './spend-log';
import type { ActionCostRange } from './spend-log';

/** Costs already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, ActionCostRange>>();

/** What an action says of its cost. */
type ActionCosting = Pick<ActionData, 'cost' | 'upTo'>;

/** The action an entry is, a feat or class feature being one when it has an `action`. */
function actionOf(entry: ContentEntry): ActionCosting | undefined {
  if (entry.kind === ContentKind.Action) {
    return entry.data;
  }
  return entry.kind === ContentKind.Feat || entry.kind === ContentKind.ClassFeature ? entry.data.action : undefined;
}

/** What the feat, class feature or action an entry is costs to use, if it says. */
function costOf(entry: ContentEntry): ActionCostRange | undefined {
  const action = actionOf(entry);
  if (action?.cost === undefined) {
    return undefined;
  }
  return { cost: action.cost, upTo: action.upTo === undefined ? undefined : SpendCount.parse(action.upTo) };
}

/** The cost of each feat, class feature and action in the registry that has one; read once per registry. */
export function actionCosts(registry: ContentRegistry): ReadonlyMap<ContentId, ActionCostRange> {
  const existing = READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, ActionCostRange][] => {
        const cost = costOf(entry);
        return cost === undefined ? [] : [[entry.id, cost]];
      }),
  );
  READ.set(registry, read);
  return read;
}

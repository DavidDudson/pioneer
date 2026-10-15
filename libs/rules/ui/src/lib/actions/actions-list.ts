import { ActionStatus } from '@pioneer/rules/engine';
import type { ActionOriginKind } from '@pioneer/rules/engine';
import { ActionCost } from '@pioneer/rules/sdk';
import type { ActionMode } from '@pioneer/rules/sdk';

import type { ActionLine } from './action-line';

/** Which view of the actions is open: those usable at this moment, or every one. */
export const ActionsViewKind = { Now: 'now', All: 'all' } as const;
export type ActionsViewKind = (typeof ActionsViewKind)[keyof typeof ActionsViewKind];

/** An action with no cost is passive: a group of its own after the costs. */
export const PASSIVE = 'passive';
export type CostGroup = ActionCost | typeof PASSIVE;

/** The cost groups in the order the Now view lists them. */
export const COST_ORDER: readonly CostGroup[] = [
  ActionCost.One,
  ActionCost.Two,
  ActionCost.Three,
  ActionCost.Free,
  ActionCost.Reaction,
  PASSIVE,
];

/** The group an action belongs to by its cost. */
function costGroupOf({ cost }: ActionLine): CostGroup {
  return cost ?? PASSIVE;
}

/** The actions of one cost. */
export interface ActionGroup {
  readonly cost: CostGroup;
  readonly lines: readonly ActionLine[];
}

/** The most pressing first; actions the situation does not call for keep their order. */
function byPriority(left: ActionLine, right: ActionLine): number {
  const first = left.priority ?? Number.POSITIVE_INFINITY;
  const second = right.priority ?? Number.POSITIVE_INFINITY;
  if (first === second) {
    return 0;
  }
  return first < second ? -1 : 1;
}

/** The best (lowest) priority in a group, which is infinity when the situation calls for none of it. */
function groupPriority({ lines }: ActionGroup): number {
  return Math.min(...lines.map((line) => line.priority ?? Number.POSITIVE_INFINITY));
}

/**
 * What a character can do at this moment in `mode`, grouped by cost: the available and conditional actions of the mode,
 * leaving those that need a situation that does not hold. Context reorders it: the actions the situation calls for come
 * first in their group, and the groups holding them come before the rest.
 */
export function nowGroups(lines: readonly ActionLine[], mode: ActionMode): readonly ActionGroup[] {
  const usable = lines.filter(
    (line) => line.status !== ActionStatus.Unavailable && !line.dormant && line.modes.includes(mode),
  );
  const groups = COST_ORDER.map((cost): ActionGroup => ({
    cost,
    lines: usable.filter((line) => costGroupOf(line) === cost).toSorted(byPriority),
  })).filter(({ lines: grouped }) => grouped.length > 0);
  return groups.toSorted((left, right) => {
    const first = groupPriority(left);
    const second = groupPriority(right);
    if (first === second) {
      return 0;
    }
    return first < second ? -1 : 1;
  });
}

/** What narrows the All view; an empty set lets everything through. */
export interface ActionFilters {
  readonly modes: ReadonlySet<ActionMode>;
  readonly costs: ReadonlySet<CostGroup>;
  readonly traits: ReadonlySet<string>;
  readonly sources: ReadonlySet<ActionOriginKind>;
}

export const NO_FILTERS: ActionFilters = { modes: new Set(), costs: new Set(), traits: new Set(), sources: new Set() };

/** Whether `picked` lets through a line with any of `held`; nothing picked lets all through. */
function passes<TValue>(picked: ReadonlySet<TValue>, held: readonly TValue[]): boolean {
  return picked.size === 0 || held.some((value) => picked.has(value));
}

/** Every action, narrowed by mode, trait, cost and source; one filter is OR within, all of them AND across. */
export function filterActions(lines: readonly ActionLine[], filters: ActionFilters): readonly ActionLine[] {
  return lines.filter(
    (line) =>
      passes(filters.modes, line.modes) &&
      passes(filters.costs, [costGroupOf(line)]) &&
      passes(filters.traits, line.traits) &&
      passes(filters.sources, [line.origin.kind]),
  );
}

/** The traits any action has, in the order `compare` gives. */
export function traitsOf(
  lines: readonly ActionLine[],
  compare: (left: string, right: string) => number,
): readonly string[] {
  return [...new Set(lines.flatMap((line) => line.traits))].toSorted(compare);
}

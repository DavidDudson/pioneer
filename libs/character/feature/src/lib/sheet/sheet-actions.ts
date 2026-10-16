import {
  actionCosts,
  characterActionContext,
  characterActions,
  SpendCount,
  SpendKind,
  turnAllows,
} from '@pioneer/character/domain';
import type { Character, ResourcesSpent, SpendCost, TurnState } from '@pioneer/character/domain';
import { ActionOriginKind } from '@pioneer/rules/engine';
import type { AvailableAction } from '@pioneer/rules/engine';
import { ACTION_COUNT, ActionCost, ContentKind, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { ActionLine } from '@pioneer/rules/ui';

import { traitNames } from './sheet-build';
import { EQUIPMENT_CONTENT_KINDS } from './sheet-equipment';
import { sheetSources } from './sheet-sources';

/** What the actions list reads beside the equipment: the actions themselves, and the feats that grant some. */
export const ACTION_CONTENT_KINDS: readonly ContentKind[] = [
  ...EQUIPMENT_CONTENT_KINDS,
  ContentKind.Action,
  ContentKind.Feat,
  ContentKind.Effect,
];

/** The entries of the registry that can be on the list, by id. */
function entriesById(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  return new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
}

/** The traits an action entry or a feat's action carries, as the vocabulary names them. */
function traitsOf(entry: ContentEntry | undefined, names: ReadonlyMap<Trait, string>): readonly string[] {
  return (entry?.traits ?? []).map((trait) => names.get(Trait.parse(trait)) ?? trait);
}

/** What the actions are worked out against: the uses spent, and the turn that decides what can be afforded now. */
export interface SheetActionsPlay {
  readonly resources: Pick<ResourcesSpent, 'uses'>;
  readonly turn?: TurnState | undefined;
}

/**
 * A character's actions as the sheet lists them (#353): what the engine decides about each (`characterActions`: whether
 * it can be used, why not, the roll when it rolls) with its name, traits and source, and where the situation puts it
 * (`characterActionContext`: prone calls for Stand and Crawl, grabbed for Escape, a raised shield enables Shield Block).
 */
export function sheetActions(
  registry: ContentRegistry,
  character: Character,
  play: SheetActionsPlay,
): readonly ActionLine[] {
  const sources = sheetSources(registry, character);
  const actions = characterActions(character.document, sources, play.resources);
  const context = characterActionContext(character.document, sources);
  const entries = entriesById(registry);
  const traits = traitNames(registry);
  const costs = actionCosts(registry);
  const priorities = new Map(context.first.map((id, place): [ContentId, number] => [id, place]));
  return actions.map((action: AvailableAction): ActionLine => {
    const range = costs.get(action.action);
    const afford = affordability(play.turn, action.cost, range?.upTo);
    return {
      id: action.action,
      name: entries.get(action.action)?.name ?? action.action,
      traits: traitsOf(entries.get(action.action), traits),
      cost: action.cost,
      modes: action.modes,
      origin: action.origin,
      source:
        action.origin.kind === ActionOriginKind.Granted ? entries.get(action.origin.source.entry)?.name : undefined,
      status: action.status,
      reasons: action.reasons,
      roll: action.roll,
      priority: priorities.get(action.action),
      dormant: context.dormant.has(action.action),
      upTo: range?.upTo,
      affordable: afford.affordable,
      affordableUpTo: afford.affordableUpTo,
    };
  });
}

/**
 * What using an action of `cost` spends from the turn: `actions` of them for a variable cost (else the cost's own
 * count), the reaction, or nothing for a free action. Undefined for an action with no cost to spend.
 */
export function spendCostOf(cost: ActionCost | undefined, actions: number | undefined): SpendCost | undefined {
  if (cost === undefined) {
    return undefined;
  }
  if (cost === ActionCost.Reaction) {
    return { kind: SpendKind.Reaction };
  }
  if (cost === ActionCost.Free) {
    return { kind: SpendKind.Free };
  }
  const count = actions ?? ACTION_COUNT[cost];
  return count === undefined ? undefined : { kind: SpendKind.Actions, count: SpendCount.parse(count) };
}

/** What the turn leaves of a cost: whether it can be paid, and for a variable cost the most actions it can be paid for. */
export interface Affordability {
  readonly affordable?: boolean | undefined;
  readonly affordableUpTo?: number | undefined;
}

/**
 * Whether `turn` can pay for something of `cost` (up to `upTo` actions when it varies), so the sheet offers only what
 * the turn would accept: off turn that is the reaction and free actions. Says nothing without a turn or a cost.
 */
export function affordability(
  turn: TurnState | undefined,
  cost: ActionCost | undefined,
  upTo: number | undefined,
): Affordability {
  if (turn === undefined || cost === undefined) {
    return {};
  }
  const fewest = spendCostOf(cost, undefined);
  if (fewest === undefined) {
    return {};
  }
  if (fewest.kind !== SpendKind.Actions) {
    return { affordable: turnAllows(turn, fewest) };
  }
  const counts = Array.from(
    { length: (upTo ?? fewest.count) - fewest.count + 1 },
    (_slot, index) => fewest.count + index,
  );
  const most = counts.findLast((count) => turnAllows(turn, spendCostOf(cost, count) ?? fewest));
  return { affordable: most !== undefined, affordableUpTo: most };
}

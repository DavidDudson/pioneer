import {
  actionCosts,
  characterActionContext,
  characterActions,
  equippedRules,
  itemContent,
  restrictionBlocking,
  SpendCount,
  SpendKind,
  turnAllows,
} from '@pioneer/character/domain';
import type {
  ActionCostRange,
  Character,
  ResourcesSpent,
  RestrictionInPlay,
  SpendCost,
  TurnState,
} from '@pioneer/character/domain';
import { ActionOriginKind, ActionStatus, alterAction } from '@pioneer/rules/engine';
import type { AvailableAction } from '@pioneer/rules/engine';
import { ACTION_COUNT, ActionCost, ContentKind, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { ActionLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { offTurnWithoutTrigger, turnReason } from './sheet-action-turn';
import { traitNames } from './sheet-build';
import { EQUIPMENT_CONTENT_KINDS } from './sheet-equipment';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetSources } from './sheet-sources';

/** What the actions list reads beside the equipment: the actions themselves, and the feats that grant some. */
export const ACTION_CONTENT_KINDS: readonly ContentKind[] = [
  ...EQUIPMENT_CONTENT_KINDS,
  ContentKind.Action,
  ContentKind.Feat,
  ContentKind.Effect,
  ContentKind.Environment,
];

const ATTACK = Trait.parse('attack');

/** Message keys for why an environment forbids an action. */
const EnvironmentReasonMessage = {
  /** The reason of the restriction that forbids the action, as the content words it. */
  Blocked: 'character.sheet.environments.blocked',
} as const;

/** Whether the entry `id` has the attack trait, so using it is an attack that moves the multiple attack penalty on. */
export function makesAttack(registry: ContentRegistry, id: ContentId): boolean {
  return (
    entriesById(registry)
      .get(id)
      ?.traits.some((trait) => trait === ATTACK) ?? false
  );
}

/** The entries of the registry that can be on the list, by id. */
function entriesById(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  return new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
}

/** The trait slugs an entry carries, to match against what an environment forbids. */
function traitSlugs(entry: ContentEntry | undefined): readonly Trait[] {
  return (entry?.traits ?? []).map((trait) => Trait.parse(trait));
}

/** What the actions are worked out against: the uses spent, and the turn that decides what can be afforded now. */
export interface SheetActionsPlay {
  readonly resources: Pick<ResourcesSpent, 'uses'>;
  readonly turn?: TurnState | undefined;
  /** The restrictions that hold now, from the environments the character is in; an action they forbid is unavailable. */
  readonly restrictions?: readonly RestrictionInPlay[] | undefined;
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
  const rules = equippedRules(character.document, itemContent(registry), sheetSlotContent(registry));
  const priorities = new Map(context.first.map((id, place): [ContentId, number] => [id, place]));
  return actions.map((action: AvailableAction): ActionLine => {
    const range = costs.get(action.action);
    const fit = turnFit(play.turn, action.cost, range);
    const entry = entries.get(action.action);
    const altered = entry === undefined ? undefined : alterAction(rules, entry);
    const data = entry?.kind === ContentKind.Action ? entry.data : undefined;
    const blocked = restrictionBlocking(play.restrictions ?? [], traitSlugs(entry));
    return {
      id: action.action,
      name: entry?.name ?? action.action,
      traits: (altered?.traits ?? []).map((trait) => traits.get(trait) ?? trait),
      cost: action.cost,
      modes: action.modes,
      origin: action.origin,
      source:
        action.origin.kind === ActionOriginKind.Granted ? entries.get(action.origin.source.entry)?.name : undefined,
      status: fit.affordable === false || blocked !== undefined ? ActionStatus.Unavailable : action.status,
      reasons: [
        ...action.reasons,
        ...fit.reasons,
        ...(blocked === undefined ? [] : [message(EnvironmentReasonMessage.Blocked, { reason: blocked.reason })]),
      ],
      trigger: data?.trigger,
      requirements: data?.requirementsText,
      effect: altered?.description,
      roll: action.roll,
      priority: priorities.get(action.action),
      dormant: context.dormant.has(action.action),
      upTo: range?.upTo,
      affordable: fit.affordable,
      affordableUpTo: fit.affordableUpTo,
    };
  });
}

/** What the turn leaves of an action, with the reason it can't be used when it can't. */
interface TurnFit extends Affordability {
  readonly reasons: readonly MessageDescriptor[];
}

/**
 * Whether the turn can pay for an action of `cost`, and why not: off turn a free action needs a trigger, so one without
 * is out of reach there as an action is when the turn has too few left.
 */
function turnFit(
  turn: TurnState | undefined,
  cost: ActionCost | undefined,
  range: ActionCostRange | undefined,
): TurnFit {
  const afford = offTurnWithoutTrigger(turn, range) ? { affordable: false } : affordability(turn, cost, range?.upTo);
  const reason = afford.affordable === false ? turnReason(turn, spendCostOf(cost, undefined)) : undefined;
  return { ...afford, reasons: reason === undefined ? [] : [reason] };
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

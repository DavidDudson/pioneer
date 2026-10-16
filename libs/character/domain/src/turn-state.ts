import { ConditionValue, ContentKind, Slug, slugName } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActionRestriction } from './conditions';
import type { ActiveCondition } from './conditions';
import { conditionEnded, conditionLowered } from './turn-events';
import type { TurnEvent } from './turn-events';

/** The most actions one count holds: the 3 of a turn and the quickened one. */
const ACTIONS_MAX = 4;

/** A count of actions: the ordinary actions of a turn, and what is added or taken from them. */
export const ActionCount = z.int().min(0).max(ACTIONS_MAX).brand<'ActionCount'>();
export type ActionCount = z.infer<typeof ActionCount>;

/** The quickened action a turn holds: there is one or there is none. */
export const QuickenedAction = z.int().min(0).max(1).brand<'QuickenedAction'>();
export type QuickenedAction = z.infer<typeof QuickenedAction>;

const NONE = ActionCount.parse(0);
const NO_QUICKENED = QuickenedAction.parse(0);
const ONE_QUICKENED = QuickenedAction.parse(1);

/** The actions a turn starts with. */
export const TURN_ACTIONS = ActionCount.parse(3);

/** Where a character is in the turn cycle: taking a turn, waiting for the next one, or in no encounter at all. */
export const TurnPhase = {
  Turn: 'turn',
  OffTurn: 'off-turn',
  OutOfEncounter: 'out-of-encounter',
} as const;
export type TurnPhase = ValueOf<typeof TurnPhase>;

/**
 * The turn as play state: the phase, the actions left, the quickened action left (a separate pip, as the source may
 * limit what it buys) with its restriction, and whether the reaction is spent.
 */
export const TurnStateSchema = z.strictObject({
  phase: z.enum(TurnPhase).default(TurnPhase.OutOfEncounter),
  actions: ActionCount.default(NONE),
  quickened: QuickenedAction.default(NO_QUICKENED),
  quickenedFor: ActionRestriction.optional(),
  reactionUsed: z.boolean().default(false),
});
export type TurnState = z.infer<typeof TurnStateSchema>;

/** The turn of a character that has not been in an encounter. */
export const OUT_OF_ENCOUNTER: TurnState = TurnStateSchema.parse({});

/** The ids of the conditions that change a turn's actions, where the content has them. */
export interface EconomyConditions {
  readonly quickened: ContentId | undefined;
  readonly slowed: ContentId | undefined;
  readonly stunned: ContentId | undefined;
}

const QUICKENED = Slug.parse('quickened');
const SLOWED = Slug.parse('slowed');
const STUNNED = Slug.parse('stunned');

function conditionNamed(registry: ContentRegistry, name: Slug): ContentId | undefined {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return entries.findLast((entry) => entry.kind === ContentKind.Condition && slugName(entry.slug) === name)?.id;
}

/** The quickened, slowed and stunned conditions of the content; the last pack's entry wins, as in the registry. */
export function economyConditions(registry: ContentRegistry): EconomyConditions {
  return {
    quickened: conditionNamed(registry, QUICKENED),
    slowed: conditionNamed(registry, SLOWED),
    stunned: conditionNamed(registry, STUNNED),
  };
}

/** What a condition of `id` adds up to among `conditions`: its highest value, 1 for one with no value, 0 for none. */
function strongest(conditions: readonly ActiveCondition[], id: ContentId | undefined): ActionCount {
  const values = conditions.filter(({ condition }) => condition === id).map(({ value }) => value ?? 1);
  return ActionCount.parse(Math.min(Math.max(0, ...values), ACTIONS_MAX));
}

/** The turn a Start turn leaves, the conditions it leaves, and what it did to them. */
export interface Refill {
  readonly turn: TurnState;
  readonly conditions: readonly ActiveCondition[];
  readonly events: readonly TurnEvent[];
}

/** Stunned `lost` lower, or end when nothing is left; a stunned condition with no value (a duration) only costs actions. */
function stunnedAfter(
  conditions: readonly ActiveCondition[],
  stunned: ContentId | undefined,
  lost: ActionCount,
): Pick<Refill, 'conditions' | 'events'> {
  const events: TurnEvent[] = [];
  const kept = conditions.flatMap((each): ActiveCondition[] => {
    if (each.condition !== stunned || each.value === undefined || lost === NONE) {
      return [each];
    }
    const left = each.value - lost;
    if (left <= 0) {
      events.push(conditionEnded(each.condition, each.id));
      return [];
    }
    const value = ConditionValue.parse(left);
    events.push(conditionLowered(each.condition, each.id, value));
    return [{ ...each, value }];
  });
  return { conditions: kept, events };
}

/**
 * The actions a turn starts with (Player Core): 3, one more from quickened (kept apart, as its source may limit it),
 * fewer by slowed and by stunned, which come out of the ordinary actions first. Stunned then goes down by the actions
 * it took and ends at 0. The reaction is back.
 */
export function refilled(conditions: readonly ActiveCondition[], economy: EconomyConditions): Refill {
  const quicker = conditions.find(({ condition }) => condition === economy.quickened);
  const slowed = strongest(conditions, economy.slowed);
  const stunned = conditions.some(({ condition, value }) => condition === economy.stunned && value === undefined)
    ? ActionCount.parse(ACTIONS_MAX)
    : strongest(conditions, economy.stunned);
  const ordinaryLeft = Math.max(TURN_ACTIONS - slowed, 0);
  const extra = quicker === undefined ? 0 : 1;
  const lost = ActionCount.parse(Math.min(stunned, ordinaryLeft + extra));
  const quickened = QuickenedAction.parse(extra - Math.max(lost - ordinaryLeft, 0));
  const turn: TurnState = {
    phase: TurnPhase.Turn,
    actions: ActionCount.parse(Math.max(ordinaryLeft - lost, 0)),
    quickened,
    quickenedFor: quickened === ONE_QUICKENED ? quicker?.restriction : undefined,
    reactionUsed: false,
  };
  return { turn, ...stunnedAfter(conditions, economy.stunned, lost) };
}

/** The turn End turn leaves: no actions, and only the reaction (if unspent) until the next Start turn. */
export function turnEnded(turn: TurnState): TurnState {
  return { phase: TurnPhase.OffTurn, actions: NONE, quickened: NO_QUICKENED, reactionUsed: turn.reactionUsed };
}

/** The play edits that run the turn cycle. */
export const TurnCommandField = {
  /** Start turn: start-of-turn bookkeeping, then the actions and the reaction refilled. */
  StartTurn: 'startTurn',
  /** End turn: end-of-turn bookkeeping, then no actions left until the next Start turn. */
  EndTurn: 'endTurn',
  /** The encounter is over: no turn running. */
  LeaveEncounter: 'leaveEncounter',
} as const;
export type TurnCommandField = ValueOf<typeof TurnCommandField>;

export const TurnCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(TurnCommandField.StartTurn) }),
  z.object({ field: z.literal(TurnCommandField.EndTurn) }),
  z.object({ field: z.literal(TurnCommandField.LeaveEncounter) }),
]);
export type TurnCommand = z.infer<typeof TurnCommandSchema>;

/** Whether `command` runs the turn cycle. */
export function isTurnCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, TurnCommand> {
  return Object.values<unknown>(TurnCommandField).includes(command.field);
}

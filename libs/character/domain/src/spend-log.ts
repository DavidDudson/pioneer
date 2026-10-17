import { ACTION_COUNT, ActionCost, ContentId, UP_TO_MAX } from '@pioneer/rules/sdk';
import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { SlotCountKey, UseCountKey } from './counted-resources';
import { StaffCastSchema } from './staff-commands';
import { QuickenedAction } from './turn-state';

/** The most spends the log keeps; the oldest drop first. A turn holds three actions, a reaction and its free actions. */
const LOG_MAX = 100;

/** A spend's own id, chosen by the client so a retried command lands once and `undoSpend` can name it. */
export const SpendId = Uuid.brand<'SpendId'>();
export type SpendId = z.infer<typeof SpendId>;

/** How many actions one spend takes: 1 up to what a variable cost can run to. */
export const SpendCount = Pg.smallint().min(1).max(UP_TO_MAX).brand<'SpendCount'>();
export type SpendCount = z.infer<typeof SpendCount>;

/** What kind of spend a cost is: some actions, the reaction or nothing. */
export const SpendKind = { Actions: 'actions', Reaction: ActionCost.Reaction, Free: ActionCost.Free } as const;
export type SpendKind = ValueOf<typeof SpendKind>;

/**
 * What a spend takes from the turn: a number of actions, the reaction, or nothing for a free action. Stored as spent,
 * so a variable cost is the count the player chose.
 */
export const SpendCostSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(SpendKind.Actions), count: SpendCount }),
  z.strictObject({ kind: z.literal(SpendKind.Reaction) }),
  z.strictObject({ kind: z.literal(SpendKind.Free) }),
]);
export type SpendCost = z.infer<typeof SpendCostSchema>;

/** When a spend happened, as an ISO timestamp the server stamps. */
export const SpendTime = z.iso.datetime().brand<'SpendTime'>();
export type SpendTime = z.infer<typeof SpendTime>;

/** What a client asks to spend: what was used, what it costs, and the frequency use it records. */
export const SpendRequestSchema = z.strictObject({
  id: SpendId,
  /** The action, spell, Strike or item activation used, by content id. */
  action: ContentId,
  cost: SpendCostSchema,
  /** The frequency use recorded with it, so undoing the spend refunds that use too. */
  use: UseCountKey.optional(),
  /** The staff cast it records, so undoing the spend also refunds the charges and the slot that paid for it. */
  staff: StaffCastSchema.optional(),
  /** The spell slot it expends, so undoing the spend gives the slot back. */
  slot: SlotCountKey.optional(),
  /** Whether it spends a Focus Point, which undoing the spend regains. */
  focus: z.literal(true).optional(),
  /** Whether it is an attack, which moves the multiple attack penalty on and undoing the spend moves it back. */
  attack: z.literal(true).optional(),
});
export type SpendRequest = z.infer<typeof SpendRequestSchema>;

/**
 * One thing used: the request, when it happened, and how much of its actions came out of the quickened action rather
 * than the ordinary ones, which is what undoing it must put back.
 */
export const SpendEntrySchema = z.strictObject({
  ...SpendRequestSchema.shape,
  at: SpendTime,
  quickened: QuickenedAction,
});
export type SpendEntry = z.infer<typeof SpendEntrySchema>;

/** The spends since the turn began, oldest first; the actions they took are already out of the turn. */
export const SpendLogSchema = z.array(SpendEntrySchema).readonly();
export type SpendLog = z.infer<typeof SpendLogSchema>;

/** The play edits that spend from the turn and take a spend back. */
export const SpendCommandField = {
  SpendAction: 'spendAction',
  UndoSpend: 'undoSpend',
} as const;
export type SpendCommandField = ValueOf<typeof SpendCommandField>;

export const SpendCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(SpendCommandField.SpendAction), ...SpendRequestSchema.shape }),
  z.object({ field: z.literal(SpendCommandField.UndoSpend), id: SpendId }),
]);
export type SpendCommand = z.infer<typeof SpendCommandSchema>;

/** Why a spend, or taking one back, is refused. */
export const SpendProblem = {
  /** The turn has fewer actions left than the spend takes. */
  TooFewActions: 'too-few-actions',
  /** The reaction is already spent. */
  ReactionSpent: 'reaction-spent',
  /** Off turn only a reaction or a free action can be used. */
  OffTurn: 'off-turn',
  /** The cost is not one the action's own cost allows. */
  CostNotAllowed: 'cost-not-allowed',
  /** The frequency the spend records has no use left, or the action has none. */
  NoUseLeft: 'no-use-left',
  /** The id is already in the log. */
  AlreadySpent: 'already-spent',
  /** The slot the spend expends has none left. */
  NoSlotLeft: 'no-slot-left',
  /** The character has no Focus Point left to spend. */
  NoFocusLeft: 'no-focus-left',
  /** A staff cast pays for itself, so the spend can't also expend a slot or a Focus Point. */
  PaymentConflict: 'payment-conflict',
  /** The spend is flagged an attack, but the action's content has no attack trait. */
  AttackNotAllowed: 'attack-not-allowed',
  /** The spell's content rules out the slot or the Focus Point the spend pays with. */
  PaymentNotAllowed: 'payment-not-allowed',
  /** No spend in the log has that id. */
  NotSpent: 'not-spent',
} as const;
export type SpendProblem = ValueOf<typeof SpendProblem>;

/** What an action's content says it costs: the glyph, and for a variable cost the count it runs to. */
export interface ActionCostRange {
  readonly cost: ActionCost;
  readonly upTo?: SpendCount | undefined;
  /** Whether the action has a trigger, which a free action needs to be used off turn. */
  readonly triggered?: boolean | undefined;
}

/** Whether `spend` is one the action's own cost allows: its fixed count or any count up to `upTo`, the reaction or a free action. */
export function costAllowed(spend: SpendCost, { cost, upTo }: ActionCostRange): boolean {
  if (spend.kind !== SpendKind.Actions) {
    return spend.kind === cost;
  }
  const from = ACTION_COUNT[cost];
  return from !== undefined && spend.count >= from && spend.count <= (upTo ?? from);
}

/** `log` with `entry` added, the oldest dropping when it is full. */
export function spendLogged(log: SpendLog, entry: SpendEntry): SpendLog {
  return [...log, entry].slice(-LOG_MAX);
}

/** `log` without the spend named `id`. */
export function spendUndone(log: SpendLog, id: SpendId): SpendLog {
  return log.filter((entry) => entry.id !== id);
}

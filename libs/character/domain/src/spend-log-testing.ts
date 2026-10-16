import { ContentId } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { SpendCount, SpendId, SpendKind } from './spend-log';
import type { SpendCommand, SpendCost } from './spend-log';
import { ActionCount, AttackCount, QuickenedAction, TurnPhase } from './turn-state';
import type { TurnState } from './turn-state';

/** The action every test spend is of. */
export const ACTION = ContentId.parse('00000000-0000-4000-8000-000000000001');

/** Which spend of a test it is, from 1; it makes the spend's id. */
export const Serial = Pg.smallint().min(1).brand<'Serial'>();
export type Serial = z.infer<typeof Serial>;

const ID_WIDTH = 12;

/** The actions a spend, or a turn, of a test has. */
export type ActionsTaken = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const THREE: ActionsTaken = 3;

/** The id of the spend `serial` of a test. */
export function spendId(serial: Serial): SpendId {
  return SpendId.parse(`00000000-0000-4000-8000-${String(serial).padStart(ID_WIDTH, '0')}`);
}

/** A cost of `count` actions. */
export function actions(count: Exclude<ActionsTaken, 0>): SpendCost {
  return { kind: SpendKind.Actions, count: SpendCount.parse(count) };
}

/** A spend command, as a client sends it. */
export type SpendAction = Extract<SpendCommand, { field: typeof PlayCommandField.SpendAction }>;

/** The spend `serial` of `cost`, recording no frequency use. */
export function spendOf(serial: Serial, cost: SpendCost): SpendAction {
  return { field: PlayCommandField.SpendAction, id: spendId(serial), action: ACTION, cost };
}

/** A turn in `phase` with `left` actions, the quickened action when `quickened`, and the reaction `used` or not. */
export function turnOf(phase: TurnPhase, left: ActionsTaken, extras: Partial<TurnState> = {}): TurnState {
  return {
    phase,
    actions: ActionCount.parse(left),
    quickened: QuickenedAction.parse(0),
    reactionUsed: false,
    attacks: AttackCount.parse(0),
    ...extras,
  };
}

/** A fresh play state with `turn`. */
export function playIn(turn: TurnState): PlayState {
  return { ...FRESH_PLAY, turn };
}

/** The ordinary turn: three actions, and the reaction unspent. */
export const OWN_TURN = turnOf(TurnPhase.Turn, THREE);

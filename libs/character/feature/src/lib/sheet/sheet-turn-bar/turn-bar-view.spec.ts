import {
  ActionCount,
  ActionRestriction,
  AttackCount,
  ConditionDurationKind,
  ConditionInstanceId,
  endTurn,
  FRESH_PLAY,
  QuickenedAction,
  TurnPhase,
} from '@pioneer/character/domain';
import type { ActiveCondition } from '@pioneer/character/domain';
import { within } from '@pioneer/character/domain/testing';
import { RandomSeed, seededRandom } from '@pioneer/rules/dice/testing';
import { ContentId, DamageFormula, DamageType, HitPoints, NO_DEFENCES } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { PipState, turnBarView, turnLog } from './turn-bar-view';

describe(turnBarView, () => {
  it('has no pips outside a turn, and only Start turn to press out of the encounter', () => {
    const view = turnBarView({
      phase: TurnPhase.OutOfEncounter,
      actions: ActionCount.parse(0),
      quickened: QuickenedAction.parse(0),
      reactionUsed: false,
      attacks: AttackCount.parse(0),
    });
    expect(view.pips).toStrictEqual([]);
    expect([view.canStart, view.canEnd, view.canLeave]).toStrictEqual([true, false, false]);
  });

  it('shows the actions left, the spent ones and the quickened one last', () => {
    const view = turnBarView({
      phase: TurnPhase.Turn,
      actions: ActionCount.parse(1),
      quickened: QuickenedAction.parse(1),
      quickenedFor: ActionRestriction.parse('Strike only'),
      reactionUsed: false,
      attacks: AttackCount.parse(0),
    });
    expect(view.pips.map(({ state, quickened }) => [state, quickened])).toStrictEqual([
      [PipState.Left, false],
      [PipState.Spent, false],
      [PipState.Spent, false],
      [PipState.Left, true],
    ]);
    expect(view.pips.at(-1)?.restriction).toBe('Strike only');
    expect([view.canStart, view.canEnd, view.canLeave]).toStrictEqual([false, true, true]);
  });
});

describe(turnLog, () => {
  it('gives persistent damage a roll card and every other event its words alone', () => {
    const burning: ActiveCondition = {
      id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000301'),
      condition: ContentId.parse('00000000-0000-4000-8000-0000000000d1'),
      duration: { kind: ConditionDurationKind.Unlimited },
      persistent: { formula: DamageFormula.parse('1d6'), type: DamageType.Fire, assisted: false },
    };
    const { events } = endTurn(
      { ...FRESH_PLAY, conditions: [burning] },
      { limits: { ...within(HitPoints.parse(30)), effects: new Map() }, defences: NO_DEFENCES, recovery: new Map() },
      seededRandom(RandomSeed.parse(3)),
    );

    const lines = turnLog(events, 10);

    expect(lines).toHaveLength(events.length);
    expect(lines[0]?.roll?.notation).toBe('1d6');
    expect(lines[0]?.roll?.id).toBe(10);
    expect(lines[1]?.roll).toBeUndefined();
  });
});

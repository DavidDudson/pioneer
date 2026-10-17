import { describe, expect, test } from 'bun:test';

import { scriptedRandom } from '@pioneer/rules/dice/testing';
import {
  ContentId,
  HitPoints,
  NO_DEFENCES,
  SpellData,
  SpellDurationType,
  SpellRank,
  SpellTimeUnit,
} from '@pioneer/rules/sdk';

import {
  ACTIVE_SPELLS_MAX,
  ActiveSpellCommandField,
  ActiveSpellId,
  canSustain,
  lapsingSpells,
  SpellSpendKind,
  SUSTAIN_LIMIT,
  sustainedRounds,
} from './active-spells';
import type { ActiveSpell, SpellSpend } from './active-spells';
import { EffectRounds } from './effects';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayCommand, PlayLimits, PlayState } from './play-state';
import { applySpendCommand, spendRefusal } from './spend-commands';
import { SpendProblem } from './spend-log';
import type { SpendCommand } from './spend-log';
import { actions, OWN_TURN, playIn, Serial, spendId, spendOf } from './spend-log-testing';
import { TEST_SPEND, within } from './testing';
import { endTurn } from './turn-end';
import { TurnEventKind } from './turn-events';
import { startTurn } from './turn-start';

const LIMITS: PlayLimits = within(HitPoints.parse(10));
const COUNTED = LIMITS.counted;
const FORCE_BARRAGE = ContentId.parse('1c97409b-bd67-5df2-a7d3-a49aff4d3896');
const RANK = SpellRank.parse(3);
const TEN_MINUTES = EffectRounds.parse(100);
const ONE_ROUND = EffectRounds.parse(1);
const FIRST = Serial.parse(1);
const SECOND = Serial.parse(2);

function spellId(serial: number): ActiveSpellId {
  return ActiveSpellId.parse(`00000000-0000-4000-8000-${String(serial).padStart(12, '0')}`);
}

const CAST = spellId(1);
const OTHER = spellId(2);

function spend(serial: Serial, spell: SpellSpend, cost = actions(1)): SpendCommand {
  return { ...spendOf(serial, cost), action: FORCE_BARRAGE, spell };
}

function undo(serial: Serial): PlayCommand {
  return { field: PlayCommandField.UndoSpend, id: spendId(serial) };
}

function apply(play: PlayState, command: PlayCommand): PlayState {
  return applyPlayCommand(play, command, { ...LIMITS, spend: TEST_SPEND });
}

function refusal(play: PlayState, command: SpendCommand): SpendProblem | undefined {
  return spendRefusal(play, command, { counted: COUNTED, points: LIMITS.resources });
}

function activeOf(rounds: EffectRounds, sustainedThisTurn: boolean, id = CAST): ActiveSpell {
  return { id, spell: FORCE_BARRAGE, rank: RANK, remaining: rounds, sustainedThisTurn };
}

function withSpells(...spells: ActiveSpell[]): PlayState {
  return { ...playIn(OWN_TURN), activeSpells: spells };
}

function castSpend(serial: Serial, id = CAST): SpendCommand {
  return spend(serial, { kind: SpellSpendKind.Cast, id, rank: RANK, rounds: TEN_MINUTES });
}

function sustainSpend(serial: Serial, id = CAST, cost = actions(1)): SpendCommand {
  return spend(serial, { kind: SpellSpendKind.Sustain, id }, cost);
}

function dismissSpend(serial: Serial, id = CAST): SpendCommand {
  return spend(serial, { kind: SpellSpendKind.Dismiss, id });
}

describe('how long a spell can be sustained', () => {
  test('a sustained time lasts that long', () => {
    const duration = SpellData.shape.duration.parse({
      type: SpellDurationType.Time,
      count: 2,
      unit: SpellTimeUnit.Minute,
      sustained: true,
    });
    expect(sustainedRounds(duration)).toBe(EffectRounds.parse(20));
  });

  test('a sustained spell with no limit lasts 10 minutes', () => {
    expect(sustainedRounds({ type: SpellDurationType.Sustained })).toBe(SUSTAIN_LIMIT);
    expect(SUSTAIN_LIMIT).toBe(TEN_MINUTES);
  });

  test('a spell that is not sustained has no limit', () => {
    expect(sustainedRounds(undefined)).toBeUndefined();
    expect(sustainedRounds({ type: SpellDurationType.Unlimited })).toBeUndefined();
  });

  test('picks the sustained one of several durations', () => {
    const either = SpellData.shape.duration.parse({
      type: SpellDurationType.Either,
      options: [{ type: SpellDurationType.Unlimited }, { type: SpellDurationType.Sustained }],
    });
    expect(sustainedRounds(either)).toBe(SUSTAIN_LIMIT);
  });
});

describe('casting a sustained spell', () => {
  test('adds it, counted as sustained so it lasts to the end of the next turn', () => {
    const play = apply(playIn(OWN_TURN), castSpend(FIRST));
    expect(play.activeSpells).toStrictEqual([activeOf(TEN_MINUTES, true)]);
  });

  test('taking the spend back removes it', () => {
    const cast1 = apply(playIn(OWN_TURN), castSpend(FIRST));
    const play = apply(cast1, undo(FIRST));
    expect(play.activeSpells).toStrictEqual([]);
  });

  test('an id already in use is refused', () => {
    const play = withSpells(activeOf(TEN_MINUTES, true));
    expect(refusal(play, castSpend(SECOND))).toBe(SpendProblem.TooManySpells);
  });

  test('a full list is refused', () => {
    const full = Array.from({ length: ACTIVE_SPELLS_MAX }, (_slot, index) =>
      activeOf(TEN_MINUTES, true, spellId(index + 100)),
    );
    expect(refusal(withSpells(...full), castSpend(FIRST, OTHER))).toBe(SpendProblem.TooManySpells);
  });
});

describe('sustaining', () => {
  test('marks the spell sustained and takes one action', () => {
    const play = apply(withSpells(activeOf(TEN_MINUTES, false)), sustainSpend(FIRST));
    expect(play.activeSpells[0]?.sustainedThisTurn).toBe(true);
    expect(play.turn.actions).toBe(OWN_TURN.actions - 1);
  });

  test('taking the spend back refunds the action and unmarks it', () => {
    const spent = apply(withSpells(activeOf(TEN_MINUTES, false)), sustainSpend(FIRST));
    const play = apply(spent, undo(FIRST));
    expect(play.activeSpells[0]?.sustainedThisTurn).toBe(false);
    expect(play.turn.actions).toBe(OWN_TURN.actions);
  });

  test('once a turn only', () => {
    const play = withSpells(activeOf(TEN_MINUTES, true));
    expect(refusal(play, sustainSpend(FIRST))).toBe(SpendProblem.AlreadySustained);
  });

  test('not past the longest it can last', () => {
    const last = activeOf(ONE_ROUND, false);
    expect(canSustain(last)).toBe(false);
    expect(refusal(withSpells(last), sustainSpend(FIRST))).toBe(SpendProblem.SustainLimit);
  });

  test('a spell that is not active is refused', () => {
    expect(refusal(playIn(OWN_TURN), sustainSpend(FIRST, OTHER))).toBe(SpendProblem.NoSuchSpell);
  });

  test('takes exactly one action', () => {
    const play = withSpells(activeOf(TEN_MINUTES, false));
    const two = sustainSpend(FIRST, CAST, actions(2));
    expect(refusal(play, two)).toBe(SpendProblem.CostNotAllowed);
  });
});

describe('dismissing', () => {
  test('at will removes the spell and spends nothing', () => {
    const play = apply(withSpells(activeOf(TEN_MINUTES, false)), {
      field: ActiveSpellCommandField.DismissSpell,
      id: CAST,
    });
    expect(play.activeSpells).toStrictEqual([]);
    expect(play.turn).toStrictEqual(OWN_TURN);
  });

  test('with the Dismiss action removes it for one action, and taking the spend back restores it', () => {
    const spell = activeOf(TEN_MINUTES, false);
    const spent = apply(withSpells(spell), dismissSpend(FIRST));
    expect(spent.activeSpells).toStrictEqual([]);
    expect(spent.turn.actions).toBe(OWN_TURN.actions - 1);
    const play = apply(spent, undo(FIRST));
    expect(play.activeSpells).toStrictEqual([spell]);
    expect(applySpendCommand(play, dismissSpend(SECOND, OTHER), { ...LIMITS, ...TEST_SPEND })).toStrictEqual(play);
  });
});

describe('the turn cycle', () => {
  const random = scriptedRandom([]);

  test('Start turn counts a round off, and a spell on its last round ends', () => {
    const play = withSpells(activeOf(TEN_MINUTES, false), activeOf(ONE_ROUND, false, OTHER));
    const { play: begun, events } = startTurn(play, { limits: LIMITS, recovery: [] }, random);
    expect(begun.activeSpells).toStrictEqual([activeOf(EffectRounds.parse(99), false)]);
    expect(events.filter(({ kind }) => kind === TurnEventKind.SpellEnded)).toHaveLength(1);
  });

  test('End turn lists the spells that were not sustained', () => {
    const play = withSpells(activeOf(TEN_MINUTES, true), activeOf(TEN_MINUTES, false, OTHER));
    expect(lapsingSpells(play.activeSpells).map(({ id }) => id)).toStrictEqual([OTHER]);
  });

  test('End turn ends them, and the spells that were sustained must be sustained again', () => {
    const play = withSpells(activeOf(TEN_MINUTES, true), activeOf(TEN_MINUTES, false, OTHER));
    const inputs = { limits: LIMITS, defences: NO_DEFENCES, recovery: new Map() };
    const { play: ended, events } = endTurn(play, inputs, random);
    expect(ended.activeSpells).toStrictEqual([activeOf(TEN_MINUTES, false)]);
    expect(events.filter(({ kind }) => kind === TurnEventKind.SpellEnded)).toHaveLength(1);
  });
});

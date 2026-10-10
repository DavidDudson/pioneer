import { describe, expect, test } from 'bun:test';

import { applyDamage, DiceExpressionText, DieFace, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { RollResult } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';

import { damageTargetOf, DefenceStatusKind, deriveDefences } from './defences';
import type { AdjustmentLine, Defences } from './defences';
import { EngineMessage } from './messages';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
/** Raging, so `self:effect:rage` holds and `self:effect:fly` does not; `terrain:*` is unknown on the sheet. */
const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

const RAGE = ['self:effect:rage'];
const FLYING = ['self:effect:fly'];
const IN_FOREST = ['terrain:forest'];
const DEFENCE_MAX = 32_767;

function defences(rules: readonly RuleInPlay[]): Defences {
  return deriveDefences(content, inputs, { rules, facts });
}

function resistance(type: readonly string[], value: number | string, fields: object = {}): object {
  return { key: 'Resistance', type, value, ...fields };
}

function weakness(type: readonly string[], value: number | string, fields: object = {}): object {
  return { key: 'Weakness', type, value, ...fields };
}

function roll(text: string, faces: readonly number[]): RollResult {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return rollDice(outcome.expression, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

/** A line's id, type, value and status kind, for comparing several lines at once. */
interface LineSummary {
  readonly id: RuleId;
  readonly type: string;
  readonly value: number | undefined;
  readonly kind: string;
}

function summaries(lines: readonly AdjustmentLine[]): readonly LineSummary[] {
  return lines.map(({ id, type, value, status }) => ({ id, type, value, kind: status.kind }));
}

function byId(left: LineSummary, right: LineSummary): number {
  return Number(left.id > right.id) - Number(left.id < right.id);
}

describe('deriveDefences', () => {
  test('an Immunity gives one immunity per type, with its origin, label and exceptions', () => {
    const rule = inPlay({ key: 'Immunity', type: ['sleep', 'fire'], exceptions: ['magical'] }, 'dragon-blood');
    const shared = {
      id: ruleIdOf(rule),
      label: { entry: rule.origin.entry },
      origin: rule.origin,
      exceptions: ['magical'],
      status: { kind: DefenceStatusKind.Applied },
    };
    const { immunities }: { readonly immunities: unknown } = defences([rule]);
    expect(immunities).toStrictEqual([
      { ...shared, type: 'fire' },
      { ...shared, type: 'sleep' },
    ]);
  });

  test('a Weakness gives a line per type or group, with its value', () => {
    const rule = inPlay(weakness(['cold', 'physical'], 5, { display: { label: 'Fire heart' } }), 'fire-heart');
    const { weaknesses, resistances }: { readonly weaknesses: unknown; readonly resistances: unknown } = defences([
      rule,
    ]);
    expect(resistances).toStrictEqual([]);
    expect(weaknesses).toStrictEqual(
      ['cold', 'physical'].map((type) => ({
        id: ruleIdOf(rule),
        label: { text: 'Fire heart' },
        origin: rule.origin,
        type,
        value: 5,
        exceptions: [],
        status: { kind: DefenceStatusKind.Applied },
      })),
    );
  });

  test('a value formula reads the character and the level of the item it is on', () => {
    const { resistances } = defences([
      inPlay(resistance(['fire'], '@level'), 'by-level'),
      inPlay(resistance(['cold'], 'floor(@item.level / 2)'), 'by-item', { itemLevel: 6 }),
    ]);
    const values: unknown = resistances.map(({ type, value }) => ({ type, value }));
    expect(values).toStrictEqual([
      { type: 'cold', value: 3 },
      { type: 'fire', value: 5 },
    ]);
  });

  test('a predicate that holds applies, a false one drops the defence, an unknown one makes it conditional', () => {
    const { immunities, resistances } = defences([
      inPlay({ key: 'Immunity', type: ['fear'], predicate: RAGE }, 'rage'),
      inPlay({ key: 'Immunity', type: ['grabbed'], predicate: FLYING }, 'flight'),
      inPlay(resistance(['cold'], 5, { predicate: IN_FOREST }), 'forest-ward'),
    ]);
    const immune: unknown = immunities.map(({ type, status }) => ({ type, kind: status.kind }));
    expect(immune).toStrictEqual([{ type: 'fear', kind: DefenceStatusKind.Applied }]);
    const resistant: unknown = resistances;
    expect(resistant).toMatchObject([
      { type: 'cold', value: 5, status: { kind: DefenceStatusKind.Conditional, when: IN_FOREST } },
    ]);
    expect(resistances[0]?.status).toHaveProperty('summary');
  });

  test('a formula that cannot be evaluated fails the line, pointing into it', () => {
    const { resistances }: { readonly resistances: unknown } = defences([
      inPlay(resistance(['fire'], '2 + @stat.ac'), 'reads-ac'),
    ]);
    expect(resistances).toMatchObject([
      { type: 'fire', value: undefined, status: { kind: DefenceStatusKind.Failed, position: 5 } },
    ]);
  });

  test('a value of 0 or less comes to nothing', () => {
    const spent = inPlay(weakness(['fire'], '@level - 5'), 'spent');
    expect(defences([spent]).weaknesses).toStrictEqual([]);
  });

  test('a value past what a resistance can be fails the line', () => {
    const { resistances }: { readonly resistances: unknown } = defences([
      inPlay(resistance(['fire'], '@level * 10000'), 'huge'),
    ]);
    expect(resistances).toMatchObject([
      {
        value: undefined,
        status: {
          kind: DefenceStatusKind.Failed,
          error: message(EngineMessage.DefenceOutOfRange, { maximum: DEFENCE_MAX }),
          position: undefined,
        },
      },
    ]);
  });

  test('per type or group only the highest unconditional value counts; conditional ones stay beside it', () => {
    const low = inPlay(resistance(['fire'], 5), 'low');
    const high = inPlay(resistance(['fire'], 10), 'high');
    const forest = inPlay(resistance(['fire'], 15, { predicate: IN_FOREST }), 'forest');
    const energy = inPlay(resistance(['energy'], 3), 'energy');
    const { resistances } = defences([low, high, forest, energy]);
    const fire = [
      { id: ruleIdOf(low), type: 'fire', value: 5, kind: DefenceStatusKind.Superseded },
      { id: ruleIdOf(high), type: 'fire', value: 10, kind: DefenceStatusKind.Applied },
      { id: ruleIdOf(forest), type: 'fire', value: 15, kind: DefenceStatusKind.Conditional },
    ].toSorted(byId);
    expect(summaries(resistances)).toStrictEqual([
      { id: ruleIdOf(energy), type: 'energy', value: 3, kind: DefenceStatusKind.Applied },
      ...fire,
    ]);
    const superseded = resistances.find(({ id }) => id === ruleIdOf(low));
    expect(superseded?.status).toStrictEqual({ kind: DefenceStatusKind.Superseded, by: ruleIdOf(high) });
  });

  test('a tie goes to the lowest id, whatever the order of the rules', () => {
    const rules = [inPlay(weakness(['cold'], 5), 'one'), inPlay(weakness(['cold'], 5), 'other')];
    const [first, second] = rules.map((rule) => ruleIdOf(rule)).toSorted();
    const forwards = defences(rules);
    const lines: unknown = summaries(forwards.weaknesses);
    expect(lines).toStrictEqual([
      { id: first, type: 'cold', value: 5, kind: DefenceStatusKind.Applied },
      { id: second, type: 'cold', value: 5, kind: DefenceStatusKind.Superseded },
    ]);
    expect(defences(rules.toReversed())).toStrictEqual(forwards);
  });

  test('other rule elements are ignored', () => {
    const { immunities, weaknesses, resistances } = defences([inPlay({ key: 'DexterityCap', value: 1 }, 'armor')]);
    expect([...immunities, ...weaknesses, ...resistances]).toStrictEqual([]);
  });
});

describe('damageTargetOf', () => {
  const forestImmunity = inPlay({ key: 'Immunity', type: ['poison'], predicate: IN_FOREST }, 'forest-immune');
  const forestWeakness = inPlay(weakness(['cold'], 2, { predicate: IN_FOREST }), 'forest-weakness');
  const rules = [
    inPlay({ key: 'Immunity', type: ['fire', 'fear'] }, 'immune'),
    inPlay({ key: 'Immunity', type: ['fire'] }, 'immune-again'),
    forestImmunity,
    inPlay(resistance(['physical'], 5, { exceptions: ['adamantine'] }), 'physical'),
    inPlay(resistance(['physical'], 3), 'physical-lower'),
    forestWeakness,
  ];

  test('takes the applied defences, each immunity once, with exceptions where there are any', () => {
    const target: unknown = damageTargetOf(defences(rules));
    expect(target).toStrictEqual({
      immunities: ['fear', 'fire'],
      weaknesses: [],
      resistances: [{ type: 'physical', value: 5, exceptions: ['adamantine'] }],
    });
  });

  test('adds the conditional defences whose rules are toggled on', () => {
    const on = new Set([ruleIdOf(forestImmunity), ruleIdOf(forestWeakness)]);
    const target: unknown = damageTargetOf(defences(rules), on);
    expect(target).toMatchObject({
      immunities: ['fear', 'fire', 'poison'],
      weaknesses: [{ type: 'cold', value: 2 }],
    });
  });

  test('is what the damage pipeline takes', () => {
    const target = damageTargetOf(defences(rules));
    const taken: number = applyDamage(roll('1d8[slashing]+1d6[fire]', [6, 4]), target).taken;
    // Slashing 6 less physical resistance 5; fire is ignored.
    expect(taken).toBe(1);
  });
});

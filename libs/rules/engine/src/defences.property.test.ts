import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, oneof, property, record, shuffledSubarray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { AdjustmentLine, Defences } from './defences';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';

const VALUE_MAX = 20;
const DEFENCES_MAX = 12;

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

/** Predicates that hold, fail or depend on the situation. */
const HOLDS = ['self:effect:rage'];
const FAILS = ['self:effect:fly'];
const UNKNOWN = ['terrain:forest'];
/** A value formula that fails (no statistic is readable), and one that comes to 0 or less at level 1. */
const FAILING = '@stat.ac';
const NOTHING = '@level - 5';

interface DefenceSpec {
  readonly key: string;
  readonly type: string;
  readonly value: number | string;
  readonly predicate: readonly string[] | undefined;
}

const defenceSpec: Arbitrary<DefenceSpec> = record({
  key: constantFrom('Weakness', 'Resistance'),
  type: constantFrom('fire', 'physical', 'all'),
  value: oneof(integer({ min: 1, max: VALUE_MAX }), constantFrom(FAILING, NOTHING)),
  predicate: constantFrom(undefined, HOLDS, FAILS, UNKNOWN),
});

/** Each spec as a rule in play on its own entry, so ids are distinct. */
function rules(specs: readonly DefenceSpec[]): RuleInPlay[] {
  return specs.map(({ key, type, value, predicate }, index) =>
    inPlay({ key, type: [type], value, ...(predicate === undefined ? {} : { predicate }) }, `defence-${index}`),
  );
}

function derive(rulesInPlay: readonly RuleInPlay[]): Defences {
  return deriveDefences(content, inputs, { rules: rulesInPlay, facts });
}

/** Checks one type's lines against the specs that gave them. */
function checkType(lines: readonly AdjustmentLine[], specs: readonly DefenceSpec[]): void {
  const kept = specs.filter(({ predicate, value }) => predicate !== FAILS && value !== NOTHING);
  const failing = kept.filter(({ value }) => value === FAILING);
  const valued = kept.filter(({ value }) => typeof value === 'number');
  const unconditional = valued.filter(({ predicate }) => predicate === undefined || predicate === HOLDS);
  const values = unconditional.map(({ value }) => Number(value));
  const applied = lines.filter(({ status }) => status.kind === DefenceStatusKind.Applied);
  expect(applied).toHaveLength(Math.min(1, unconditional.length));
  const [winner] = applied;
  const highest: number | undefined = winner?.value;
  expect(highest).toBe(unconditional.length === 0 ? undefined : Math.max(...values));
  for (const line of lines.filter(({ status }) => status.kind === DefenceStatusKind.Superseded)) {
    const status: unknown = line.status;
    expect(status).toStrictEqual({ kind: DefenceStatusKind.Superseded, by: winner?.id });
    expect(line.value ?? 0).toBeLessThanOrEqual(highest ?? 0);
  }
  const conditional = lines.filter(({ status }) => status.kind === DefenceStatusKind.Conditional);
  expect(conditional).toHaveLength(valued.filter(({ predicate }) => predicate === UNKNOWN).length);
  const failed = lines.filter(({ status }) => status.kind === DefenceStatusKind.Failed);
  expect(failed).toHaveLength(failing.length);
  expect(lines).toHaveLength(valued.length + failing.length);
}

describe('deriveDefences (properties)', () => {
  test('per type or group, only the highest unconditional weakness or resistance counts', () => {
    assert(
      property(array(defenceSpec, { maxLength: DEFENCES_MAX }), (specs) => {
        const defences = derive(rules(specs));
        for (const [key, lines] of [
          ['Weakness', defences.weaknesses],
          ['Resistance', defences.resistances],
        ] as const) {
          for (const type of ['fire', 'physical', 'all']) {
            checkType(
              lines.filter((line) => line.type === type),
              specs.filter((spec) => spec.key === key && spec.type === type),
            );
          }
        }
      }),
    );
  });

  test('the result does not depend on the order of the rules', () => {
    assert(
      property(
        array(defenceSpec, { maxLength: DEFENCES_MAX }).chain((specs) => {
          const inPlayRules = rules(specs);
          return shuffledSubarray(inPlayRules, { minLength: inPlayRules.length }).map((shuffled) => ({
            inPlayRules,
            shuffled,
          }));
        }),
        ({ inPlayRules, shuffled }) => {
          expect(derive(shuffled)).toStrictEqual(derive(inPlayRules));
        },
      ),
    );
  });
});

import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { DamageAdjustmentTarget, DamageException } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import {
  array,
  assert,
  boolean,
  constantFrom,
  integer,
  property,
  record,
  shuffledSubarray,
  subarray,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { AdjustmentLine, Defences } from './defences';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';

const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const NO_FACTS = new PredicateFacts([], CORE_NAMESPACES);
const VALUE_MAX = 20;
const RULES_MAX = 12;

interface GeneratedDefence {
  readonly key: 'Weakness' | 'Resistance';
  readonly type: DamageAdjustmentTarget;
  readonly value: number;
  readonly exceptions: readonly DamageException[];
  /** Depends on a situation the sheet cannot know. */
  readonly situational: boolean;
}

/** A few types and exceptions, so lines often compete. */
const defence: Arbitrary<GeneratedDefence> = record({
  key: constantFrom('Weakness', 'Resistance'),
  type: constantFrom(DamageAdjustmentTarget.Fire, DamageAdjustmentTarget.Physical, DamageAdjustmentTarget.Slashing),
  value: integer({ min: 1, max: VALUE_MAX }),
  exceptions: subarray([DamageException.Adamantine, DamageException.Silver]),
  situational: boolean(),
});

function rulesOf(defences: readonly GeneratedDefence[]): readonly RuleInPlay[] {
  return defences.map(({ key, type, value, exceptions, situational }, index) =>
    inPlay(
      {
        key,
        type,
        value,
        ...(exceptions.length === 0 ? {} : { exceptions }),
        ...(situational ? { predicate: ['terrain:forest'] } : {}),
      },
      `defence-${index}`,
    ),
  );
}

function derived(rules: readonly RuleInPlay[]): Defences {
  return deriveDefences(content, inputs, { rules, facts: NO_FACTS });
}

function sameKey(left: AdjustmentLine, right: AdjustmentLine): boolean {
  return left.type === right.type && left.exceptions.toSorted().join(' ') === right.exceptions.toSorted().join(' ');
}

/** Every unconditional line competing with `line`, `line` included. */
function competitors(lines: readonly AdjustmentLine[], line: AdjustmentLine): readonly AdjustmentLine[] {
  return lines.filter(
    (other) =>
      sameKey(other, line) &&
      (other.status.kind === DefenceStatusKind.Applied || other.status.kind === DefenceStatusKind.Superseded),
  );
}

function appliedCount(lines: readonly AdjustmentLine[]): number {
  return lines.filter(({ status }) => status.kind === DefenceStatusKind.Applied).length;
}

describe('deriveDefences (properties)', () => {
  test('per type or group and exceptions, only the highest unconditional value applies', () => {
    assert(
      property(array(defence, { maxLength: RULES_MAX }), (defences) => {
        const result = derived(rulesOf(defences));
        for (const lines of [result.weaknesses, result.resistances]) {
          for (const line of lines) {
            const group = competitors(lines, line);
            const applied = group.filter(({ status }) => status.kind === DefenceStatusKind.Applied);
            const highest = Math.max(...group.map(({ value }) => value ?? 0));
            if (group.length > 0) {
              expect(applied).toHaveLength(1);
              expect(applied[0]?.value ?? 0).toBe(highest);
            }
            if (line.status.kind === DefenceStatusKind.Superseded) {
              expect(line.status.by === applied[0]?.id).toBe(true);
            }
          }
        }
      }),
    );
  });

  test('conditional lines are kept, and only applied ones reach the target', () => {
    assert(
      property(array(defence, { maxLength: RULES_MAX }), (defences) => {
        const result = derived(rulesOf(defences));
        const lines = [...result.weaknesses, ...result.resistances];
        expect(lines).toHaveLength(defences.length);
        const situational = defences.filter((generated) => generated.situational).length;
        expect(lines.filter(({ status }) => status.kind === DefenceStatusKind.Conditional)).toHaveLength(situational);
        expect(result.target.weaknesses).toHaveLength(appliedCount(result.weaknesses));
        expect(result.target.resistances).toHaveLength(appliedCount(result.resistances));
      }),
    );
  });

  test('the result does not depend on the order of the rules', () => {
    const rulesAndOrder = array(defence, { maxLength: RULES_MAX }).chain((defences) => {
      const rules = rulesOf(defences);
      return shuffledSubarray([...rules], { minLength: rules.length, maxLength: rules.length }).map(
        (shuffled): readonly [readonly RuleInPlay[], readonly RuleInPlay[]] => [rules, shuffled],
      );
    });
    assert(
      property(rulesAndOrder, ([rules, shuffled]) => {
        expect(derived(shuffled)).toStrictEqual(derived(rules));
      }),
    );
  });
});

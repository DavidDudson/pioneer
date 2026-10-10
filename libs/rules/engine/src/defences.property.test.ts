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

/** Whether `wider` meets every hit `line` meets: the same type, and its exceptions a subset of `line`'s. */
function coversHits(wider: AdjustmentLine, line: AdjustmentLine): boolean {
  const exceptions = new Set(line.exceptions);
  return wider.type === line.type && wider.exceptions.every((exception) => exceptions.has(exception));
}

function isApplied(line: AdjustmentLine): boolean {
  return line.status.kind === DefenceStatusKind.Applied;
}

function appliedCount(lines: readonly AdjustmentLine[]): number {
  return lines.filter(({ status }) => status.kind === DefenceStatusKind.Applied).length;
}

describe('deriveDefences (properties)', () => {
  test('no applied line is covered by a higher applied one, and each superseded one names an applied cover', () => {
    assert(
      property(array(defence, { maxLength: RULES_MAX }), (defences) => {
        const result = derived(rulesOf(defences));
        for (const lines of [result.weaknesses, result.resistances]) {
          const applied = lines.filter((line) => isApplied(line));
          for (const line of applied) {
            const higher = applied.filter(
              (other) => other.id !== line.id && coversHits(other, line) && (other.value ?? 0) > (line.value ?? 0),
            );
            expect(higher).toHaveLength(0);
          }
          for (const line of lines) {
            const by = line.status.kind === DefenceStatusKind.Superseded ? line.status.by : undefined;
            const cover = applied.find(({ id }) => id === by);
            expect(by === undefined || (cover !== undefined && coversHits(cover, line))).toBe(true);
            expect(by === undefined || (cover?.value ?? 0) >= (line.value ?? 0)).toBe(true);
          }
        }
      }),
    );
  });

  test('of lines with the same type and exceptions, exactly one unconditional line applies, the highest', () => {
    assert(
      property(array(defence, { maxLength: RULES_MAX }), (defences) => {
        const result = derived(rulesOf(defences));
        for (const lines of [result.weaknesses, result.resistances]) {
          const unconditional = lines.filter(({ status }) => status.kind !== DefenceStatusKind.Conditional);
          for (const line of unconditional) {
            const same = unconditional.filter((other) => coversHits(other, line) && coversHits(line, other));
            const applied = same.filter((other) => isApplied(other));
            const highest = Math.max(...same.map(({ value }) => value ?? 0));
            expect(applied.length <= 1).toBe(true);
            expect(applied.every(({ value }) => (value ?? 0) === highest)).toBe(true);
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

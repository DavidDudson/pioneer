import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { AdjustedCheck, Domain, RuleElementKey } from '@pioneer/rules/sdk';
import type {
  AdjustDegreeOfSuccessElement,
  ContentText,
  ModifierTarget,
  Predicate,
  RollKept,
  StatisticDefinition,
} from '@pioneer/rules/sdk';

import type { ModifierLabel } from './breakdown';
import { reaches } from './collect';
import { labelOf } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';
import type { StatisticResult } from './statistic-result';

const SKILL_CHECK = Domain.parse('skill-check');
const SAVING_THROW = Domain.parse('saving-throw');

/** The domain each kind of check an `AdjustDegreeOfSuccess` can be limited to belongs to. */
const CHECK_DOMAINS: Readonly<Record<AdjustedCheck, Domain>> = {
  [AdjustedCheck.Skill]: SKILL_CHECK,
  [AdjustedCheck.Save]: SAVING_THROW,
};

/** How a roll effect bears on a roll: it does, or it would if the situation said so (`summary` words when). */
export const RollEffectStatusKind = { Applied: 'applied', Conditional: 'conditional' } as const;
export type RollEffectStatus =
  | { readonly kind: typeof RollEffectStatusKind.Applied }
  | {
      readonly kind: typeof RollEffectStatusKind.Conditional;
      readonly when: Predicate;
      readonly summary: PredicateSummary | undefined;
    };

/** A `RollTwice` that reaches a statistic: fortune keeps the higher roll, misfortune the lower. */
export interface RollTwiceLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly keep: RollKept;
  readonly status: RollEffectStatus;
}

/** How an `AdjustDegreeOfSuccess` moves the degrees it names. */
export type DegreeAdjustment = AdjustDegreeOfSuccessElement['adjustment'];

/** An `AdjustDegreeOfSuccess` that reaches a statistic. */
export interface DegreeAdjustmentLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly adjustment: DegreeAdjustment;
  readonly status: RollEffectStatus;
}

/**
 * What changes how a check rolls, beyond its modifier: the fortune and misfortune that reach it and the shifts to its
 * degree of success. Both are in id order; an effect whose predicate is known to fail is left out.
 */
export interface RollEffects {
  readonly rollTwice: readonly RollTwiceLine[];
  readonly degreeAdjustments: readonly DegreeAdjustmentLine[];
}

/** A `RollTwice` or `AdjustDegreeOfSuccess` in play, before it is matched to a statistic. */
interface RollEffectSource {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly targets: readonly ModifierTarget[];
  readonly predicate: Predicate | undefined;
  readonly summary: ContentText | undefined;
}

interface RollTwiceSource extends RollEffectSource {
  readonly keep: RollKept;
}

interface DegreeSource extends RollEffectSource {
  readonly adjustment: DegreeAdjustment;
  readonly checkType: AdjustedCheck | undefined;
}

/** The `RollTwice` and `AdjustDegreeOfSuccess` elements in play. */
export interface RollEffectsInPlay {
  readonly rollTwice: readonly RollTwiceSource[];
  readonly degree: readonly DegreeSource[];
}

/** The fortune, misfortune and degree adjustments among the rules; other elements are ignored. */
export function rollEffectsInPlay(rules: readonly RuleInPlay[]): RollEffectsInPlay {
  const rollTwice: RollTwiceSource[] = [];
  const degree: DegreeSource[] = [];
  for (const rule of rules) {
    const { element } = rule;
    const common = {
      id: ruleIdOf(rule),
      label: labelOf(rule),
    };
    if (element.key === RuleElementKey.RollTwice) {
      rollTwice.push({
        ...common,
        targets: element.selectors,
        predicate: element.predicate,
        summary: element.display?.summary,
        keep: element.keep,
      });
    } else if (element.key === RuleElementKey.AdjustDegreeOfSuccess) {
      degree.push({
        ...common,
        targets: element.selectors,
        predicate: element.predicate,
        summary: element.display?.summary,
        adjustment: element.adjustment,
        checkType: element.checkType,
      });
    }
  }
  return { rollTwice, degree };
}

/** Applied when the predicate holds, conditional while it depends on the situation, and nothing when it fails. */
function statusOf(
  { id, predicate, summary }: RollEffectSource,
  facts: PredicateFacts,
  situation: ReadonlySet<RuleId>,
): RollEffectStatus | undefined {
  const truth = truthOf(predicate, facts);
  if (predicate === undefined || truth === Truth.True || (truth === Truth.Unknown && situation.has(id))) {
    return { kind: RollEffectStatusKind.Applied };
  }
  if (truth === Truth.False) {
    return undefined;
  }
  return {
    kind: RollEffectStatusKind.Conditional,
    when: predicate,
    summary: summarisePredicate(predicate, facts, summary),
  };
}

function ofCheckType(source: DegreeSource, definition: StatisticDefinition): boolean {
  return source.checkType === undefined || definition.domains.includes(CHECK_DOMAINS[source.checkType]);
}

/**
 * The fortune, misfortune and degree adjustments that reach the statistic through its selector, its domains or
 * `all`, each applied or conditional on its predicate; one limited to skill checks or saves reaches only those.
 */
export function collectRollEffects(
  definition: StatisticDefinition,
  { rollTwice, degree }: RollEffectsInPlay,
  { facts, situation }: { readonly facts: PredicateFacts; readonly situation: ReadonlySet<RuleId> },
): RollEffects {
  return {
    rollTwice: rollTwice
      .filter(({ targets }) => reaches(targets, definition))
      .toSorted((left, right) => Number(left.id > right.id) - Number(left.id < right.id))
      .flatMap((source) => {
        const status = statusOf(source, facts, situation);
        return status === undefined ? [] : [{ id: source.id, label: source.label, keep: source.keep, status }];
      }),
    degreeAdjustments: degree
      .filter((source) => reaches(source.targets, definition) && ofCheckType(source, definition))
      .toSorted((left, right) => Number(left.id > right.id) - Number(left.id < right.id))
      .flatMap((source) => {
        const status = statusOf(source, facts, situation);
        return status === undefined
          ? []
          : [{ id: source.id, label: source.label, adjustment: source.adjustment, status }];
      }),
  };
}

/** The result with the roll effects that reach it; a result with none, or that failed, is returned as it is. */
export function applyRollEffects(result: StatisticResult, effects: RollEffects): StatisticResult {
  if (!result.ok || (effects.rollTwice.length === 0 && effects.degreeAdjustments.length === 0)) {
    return result;
  }
  return { ...result, rollEffects: effects };
}

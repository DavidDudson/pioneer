import type { FormulaValue, TextPosition } from '@pioneer/rules/formula';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import type {
  ChangeMode,
  ContentId,
  DamageAdjustmentTarget,
  DamageAmount,
  DamageException,
  Feet,
  Immunity,
  ModifierType,
  Origin,
  RuleElementKey,
  RuleNumber,
  SenseAcuity,
  Selector,
} from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ModifierLabel, OverridePhase, SuppressionReason } from './breakdown';
import type { RuleId } from './rule-in-play';

/** Whether an effect is what an entry would do if taken, equipped, cast or gained, or what it is doing now. */
export const EffectMode = { WouldApply: 'would-apply', Applying: 'applying' } as const;
export type EffectMode = ValueOf<typeof EffectMode>;

export const EffectChange = {
  Bonus: 'bonus',
  Penalty: 'penalty',
  Set: 'set',
  Weakness: 'weakness',
  Resistance: 'resistance',
  Immunity: 'immunity',
  Sense: 'sense',
  NotSummarised: 'not-summarised',
} as const;
export type EffectChange = ValueOf<typeof EffectChange>;

export const EffectStatusKind = {
  Applied: 'applied',
  Suppressed: 'suppressed',
  Conditional: 'conditional',
  Inactive: 'inactive',
  Failed: 'failed',
} as const;
export type EffectStatusKind = ValueOf<typeof EffectStatusKind>;

/**
 * Whether a line counts, as the breakdown (or the defences and senses) say. A statistic's line that a better one of its
 * type, an `AdjustModifier` or a battle form overrides is suppressed, as is a set override a later one replaced, and a
 * weakness, resistance or sense a better one beats. `by` is undefined when the engine does not name what beat it.
 */
export type EffectStatus =
  | { readonly kind: typeof EffectStatusKind.Applied }
  | {
      readonly kind: typeof EffectStatusKind.Suppressed;
      readonly by: RuleId | undefined;
      readonly reason: SuppressionReason;
    }
  /** The predicate depends on facts nobody supplied; `summary` words when it would hold. */
  | { readonly kind: typeof EffectStatusKind.Conditional; readonly summary: PredicateSummary | undefined }
  | { readonly kind: typeof EffectStatusKind.Inactive }
  | {
      readonly kind: typeof EffectStatusKind.Failed;
      readonly error: MessageDescriptor;
      readonly position: TextPosition | undefined;
    };

/** What every line says of the rule element that gives it. */
interface LineBase {
  readonly rule: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly status: EffectStatus;
}

/** A typed bonus or penalty on one statistic, with the value the breakdown shows (undefined when it failed). */
export interface ModifierEffect extends LineBase {
  readonly change: typeof EffectChange.Bonus | typeof EffectChange.Penalty;
  readonly selector: Selector;
  readonly type: ModifierType;
  readonly value: FormulaValue | undefined;
  /** The `AdjustModifier`s that changed the value. */
  readonly adjustedBy: readonly RuleId[];
}

/** A `Change` on one statistic: what it did to the value, in the phase it acts in. */
export interface SetEffect extends LineBase {
  readonly change: typeof EffectChange.Set;
  readonly selector: Selector;
  readonly mode: ChangeMode;
  readonly phase: OverridePhase;
  /** The change's own value; undefined when it failed. */
  readonly value: RuleNumber | undefined;
  /** The value before this line, and after it. */
  readonly replaced: FormulaValue;
  readonly result: FormulaValue;
}

/** A weakness or resistance to a damage type or group. */
export interface DamageAdjustmentEffect extends LineBase {
  readonly change: typeof EffectChange.Weakness | typeof EffectChange.Resistance;
  readonly damage: DamageAdjustmentTarget;
  /** Undefined only when the line failed. */
  readonly value: DamageAmount | undefined;
  readonly exceptions: readonly DamageException[];
}

export interface ImmunityEffect extends LineBase {
  readonly change: typeof EffectChange.Immunity;
  readonly immunity: Immunity;
}

/** A sense, with the acuity and range it is given as written, Foundry's defaults applied. */
export interface SenseEffect extends LineBase {
  readonly change: typeof EffectChange.Sense;
  readonly sense: ContentId;
  readonly acuity: SenseAcuity;
  /** Absent when the sense reaches as far as the character can perceive. */
  readonly range?: Feet;
}

/** A rule element the summary does not cover yet: said so, rather than left out. */
export interface NotSummarisedEffect extends Omit<LineBase, 'status'> {
  readonly change: typeof EffectChange.NotSummarised;
  readonly element: RuleElementKey;
}

/** One concrete effect of an entry on a character; rendering it to text is the UI's job. */
export type EffectLine =
  | ModifierEffect
  | SetEffect
  | DamageAdjustmentEffect
  | ImmunityEffect
  | SenseEffect
  | NotSummarisedEffect;

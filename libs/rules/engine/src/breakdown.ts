import type { FormulaValue, TextPosition } from '@pioneer/rules/formula';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import type {
  ChangeMode,
  ContentId,
  ContentText,
  ModifierTarget,
  ModifierType,
  Origin,
  Predicate,
  RuleNumber,
  RuleSlug,
} from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { RuleId } from './rule-in-play';

/** What a breakdown line is called: the rule element's own label, or the name of the entry it is on. */
export type ModifierLabel = { readonly text: ContentText } | { readonly entry: ContentId };

/** A typed bonus or penalty aimed at selectors or domains, from a `FlatModifier` (rules-engine.md, "Modifiers"). */
export interface Modifier {
  readonly id: RuleId;
  /** Lets an `AdjustModifier` find it. */
  readonly slug: RuleSlug | undefined;
  readonly label: ModifierLabel;
  readonly type: ModifierType;
  readonly targets: readonly ModifierTarget[];
  readonly predicate: Predicate | undefined;
  readonly origin: Origin;
}

export const LineStatusKind = {
  Applied: 'applied',
  Suppressed: 'suppressed',
  Conditional: 'conditional',
  Inactive: 'inactive',
  Failed: 'failed',
} as const;
export type LineStatusKind = ValueOf<typeof LineStatusKind>;

/** Why a line that would apply does not: a better one of its type, or an `AdjustModifier` that suppresses it. */
export const SuppressionReason = { Stacking: 'stacking', Adjustment: 'adjustment' } as const;
export type SuppressionReason = ValueOf<typeof SuppressionReason>;

/** Why a line is inactive: its predicate is known not to hold. */
export const InactiveReason = { Predicate: 'predicate' } as const;
export type InactiveReason = ValueOf<typeof InactiveReason>;

export type LineStatus =
  | { readonly kind: typeof LineStatusKind.Applied }
  | { readonly kind: typeof LineStatusKind.Suppressed; readonly by: RuleId; readonly reason: SuppressionReason }
  /** The predicate depends on facts the sheet does not know; `summary` words when it would hold. */
  | {
      readonly kind: typeof LineStatusKind.Conditional;
      readonly when: Predicate;
      readonly summary: PredicateSummary | undefined;
    }
  | { readonly kind: typeof LineStatusKind.Inactive; readonly reason: InactiveReason }
  /** The value's formula, or an adjustment's, failed to evaluate; the error points into that formula. */
  | {
      readonly kind: typeof LineStatusKind.Failed;
      readonly error: MessageDescriptor;
      /** Where in the failing formula; undefined when an adjustment took the value out of range. */
      readonly position: TextPosition | undefined;
    };

/** One modifier as it bears on one statistic: its value after adjustments, and whether it counts. */
export interface BreakdownLine {
  readonly modifier: Modifier;
  /** Undefined only when the line failed. */
  readonly value: FormulaValue | undefined;
  /** The `AdjustModifier`s that changed the value, in the order they ran. */
  readonly adjustedBy: readonly RuleId[];
  readonly status: LineStatus;
}

/** When an override line acts: on the base before modifiers (`Change`), or on the total (a set override). */
export const OverridePhase = { Base: 'base', Total: 'total' } as const;
export type OverridePhase = ValueOf<typeof OverridePhase>;

export const OverrideStatusKind = {
  Applied: 'applied',
  Replaced: 'replaced',
  Conditional: 'conditional',
  Inactive: 'inactive',
  Failed: 'failed',
} as const;
export type OverrideStatusKind = ValueOf<typeof OverrideStatusKind>;

export type OverrideStatus =
  | { readonly kind: typeof OverrideStatusKind.Applied }
  /** A set override that a later one replaced. */
  | { readonly kind: typeof OverrideStatusKind.Replaced; readonly by: RuleId }
  | { readonly kind: typeof OverrideStatusKind.Conditional; readonly summary: PredicateSummary | undefined }
  | { readonly kind: typeof OverrideStatusKind.Inactive; readonly reason: InactiveReason }
  | {
      readonly kind: typeof OverrideStatusKind.Failed;
      readonly error: MessageDescriptor;
      readonly position: TextPosition;
    };

/**
 * A `Change` on a statistic, or a set override pinning its total: what it did, the value it replaced and the value
 * it left. `origin` says who or what did it; a set override's has an `override` hop naming the user.
 */
export interface OverrideLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly phase: OverridePhase;
  readonly mode: ChangeMode;
  /** The change's own value; undefined when it failed. */
  readonly value: RuleNumber | undefined;
  /** The value before this line, and after it; the same when it did not apply. */
  readonly replaced: FormulaValue;
  readonly result: FormulaValue;
  readonly status: OverrideStatus;
}

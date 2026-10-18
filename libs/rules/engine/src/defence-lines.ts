import type { TextPosition } from '@pioneer/rules/formula';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { DamageAmount } from '@pioneer/rules/sdk';
import type {
  DamageAdjustmentTarget,
  DamageException,
  Immunity,
  Origin,
  Predicate,
  RuleNumber,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ModifierLabel } from './breakdown';
import { EngineMessage } from './messages';
import type { RuleId } from './rule-in-play';
import { whole } from './rule-value';

export const DefenceStatusKind = {
  Applied: 'applied',
  Superseded: 'superseded',
  Conditional: 'conditional',
  Failed: 'failed',
} as const;
export type DefenceStatusKind = ValueOf<typeof DefenceStatusKind>;

export type DefenceStatus =
  | { readonly kind: typeof DefenceStatusKind.Applied }
  /** A higher unconditional weakness or resistance to the same type or group counts instead. */
  | { readonly kind: typeof DefenceStatusKind.Superseded; readonly by: RuleId }
  /** The predicate depends on facts the sheet does not know; `summary` words when it would hold. */
  | {
      readonly kind: typeof DefenceStatusKind.Conditional;
      readonly when: Predicate;
      readonly summary: PredicateSummary | undefined;
    }
  /** The value's formula failed to evaluate, or gave more than a weakness or resistance can be. */
  | {
      readonly kind: typeof DefenceStatusKind.Failed;
      readonly error: MessageDescriptor;
      /** Where in the failing formula; undefined when the value was out of range. */
      readonly position: TextPosition | undefined;
      /** The predicate of a conditional defence, kept so the sheet still says when it would apply. */
      readonly when: Predicate | undefined;
    };

/** One immunity from an `Immunity` element: applied, or conditional on the situation. */
export interface ImmunityLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly type: Immunity;
  readonly status: DefenceStatus;
}

/** One weakness or resistance from a `Weakness` or `Resistance` element, and whether it counts. */
export interface AdjustmentLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly type: DamageAdjustmentTarget;
  /** Undefined only when the line failed. */
  readonly value: DamageAmount | undefined;
  readonly exceptions: readonly DamageException[];
  readonly status: DefenceStatus;
}

/**
 * A character's immunities, weaknesses and resistances (rules-engine.md, "Defences"), each line in type order, then
 * id order. A defence whose predicate is false is left out.
 */
export interface Defences {
  readonly immunities: readonly ImmunityLine[];
  readonly weaknesses: readonly AdjustmentLine[];
  readonly resistances: readonly AdjustmentLine[];
}

/** The most a weakness or resistance can be: `DamageAmount`'s bound. */
const DEFENCE_MAX = DamageAmount.parse(32_767);
export const NONE: readonly DamageException[] = [];

/** A weakness's or resistance's value and the status it leaves; undefined when it comes to nothing (0 or less). */
export interface Valued {
  readonly value: DamageAmount | undefined;
  readonly status: DefenceStatus;
}

/** A failed line's status, keeping the predicate of a conditional one. */
export function failed(
  gated: DefenceStatus,
  error: MessageDescriptor,
  position: TextPosition | undefined,
): DefenceStatus {
  const when = gated.kind === DefenceStatusKind.Conditional ? gated.when : undefined;
  return { kind: DefenceStatusKind.Failed, error, position, when };
}

/** A value as a `DamageAmount`: nothing when 0 or less, failed past its bound. */
export function amountOf(value: RuleNumber, status: DefenceStatus): Valued | undefined {
  const rounded = whole(value);
  if (rounded !== undefined && rounded <= 0) {
    return undefined;
  }
  const amount = DamageAmount.safeParse(rounded);
  if (amount.success) {
    return { value: amount.data, status };
  }
  const error = message(EngineMessage.DefenceOutOfRange, { maximum: DEFENCE_MAX });
  return { value: undefined, status: failed(status, error, undefined) };
}

import { LineStatusKind } from '@pioneer/rules/engine';
import { ModifierType } from '@pioneer/rules/sdk';

/** Message keys the breakdown inspector renders with, spelled out so the key check sees them. */
export const BreakdownMessage = {
  /** "Base 13": the value the base formula's terms and `Change`s give, before modifiers. */
  Base: 'rules.breakdown.base',
  /** "gives 3": what one term of the base formula adds. */
  TermValue: 'rules.breakdown.termValue',
  Rounding: 'rules.breakdown.rounding',
  /** A `@prof` term whose bonus a variant rule sets. */
  TermVariant: 'rules.breakdown.termVariant',
  Modifiers: 'rules.breakdown.modifiers',
  NoModifiers: 'rules.breakdown.noModifiers',
  /** "+1 status": a line's signed value and its type. */
  LineValue: 'rules.breakdown.lineValue',
  /** A line that lost to a better one of its type. */
  SuppressedBy: 'rules.breakdown.suppressedBy',
  /** A line an `AdjustModifier` removed. */
  RemovedBy: 'rules.breakdown.removedBy',
  AppliesWhen: 'rules.breakdown.appliesWhen',
  Inactive: 'rules.breakdown.inactive',
} as const;

/** The status a line that does not simply apply is marked with. */
export type MarkedLineStatus = Exclude<LineStatusKind, typeof LineStatusKind.Applied>;

export const LINE_STATUS_MESSAGES: Readonly<Record<MarkedLineStatus, string>> = {
  [LineStatusKind.Suppressed]: 'rules.breakdown.status.suppressed',
  [LineStatusKind.Conditional]: 'rules.breakdown.status.conditional',
  [LineStatusKind.Inactive]: 'rules.breakdown.status.inactive',
  [LineStatusKind.Failed]: 'rules.breakdown.status.failed',
};

export const LINE_STATUS_TONES = {
  [LineStatusKind.Suppressed]: 'neutral',
  [LineStatusKind.Conditional]: 'warning',
  [LineStatusKind.Inactive]: 'neutral',
  [LineStatusKind.Failed]: 'danger',
} as const satisfies Readonly<Record<MarkedLineStatus, string>>;

/** The order lines are listed in: what counts first, then what might, then what does not. */
export const LINE_STATUS_ORDER: readonly LineStatusKind[] = [
  LineStatusKind.Applied,
  LineStatusKind.Conditional,
  LineStatusKind.Suppressed,
  LineStatusKind.Inactive,
  LineStatusKind.Failed,
];

export const MODIFIER_TYPE_MESSAGES: Readonly<Record<ModifierType, string>> = {
  [ModifierType.Untyped]: 'rules.breakdown.modifierType.untyped',
  [ModifierType.Status]: 'rules.breakdown.modifierType.status',
  [ModifierType.Circumstance]: 'rules.breakdown.modifierType.circumstance',
  [ModifierType.Item]: 'rules.breakdown.modifierType.item',
  [ModifierType.Proficiency]: 'rules.breakdown.modifierType.proficiency',
  [ModifierType.Attribute]: 'rules.breakdown.modifierType.attribute',
  [ModifierType.Potency]: 'rules.breakdown.modifierType.potency',
};

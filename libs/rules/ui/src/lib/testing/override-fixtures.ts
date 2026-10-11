import { InactiveReason, OverridePhase, OverrideStatusKind } from '@pioneer/rules/engine';
import type { ModifierLabel, OverrideLine, OverrideStatus, StatisticValue } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import {
  ChangeMode,
  ContentId,
  ContentText,
  contentId,
  Origin,
  PackId,
  RuleNumber,
  Slug,
  StatisticKind,
} from '@pioneer/rules/sdk';

import type { NamedStatistic } from '../statistics/statistics.component';
import { FIGHTER_AC, FIGHTER_STATISTICS, GOLEM_FORM, origin, ruleId, statistic } from './breakdown-fixtures';

/** The rule elements a user set on the character by hand. */
const OVERRIDES = ContentId.parse(contentId(PackId.parse('character'), Slug.parse('overrides')));

/** A rule element a user set on the character by hand, with the `override` hop naming them. */
function byHand(entry: ContentId): Origin {
  return Origin.parse({
    hops: [{ kind: 'override', by: '00000000-0000-4000-8000-00000000de01', at: '2026-01-01T00:00:00.000Z' }],
    entry,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
  });
}

interface OverrideOptions {
  readonly phase: OverridePhase;
  readonly mode: ChangeMode;
  /** Left out for a failed line. */
  readonly value?: number;
  readonly replaced: number;
  /** By default, the value it replaced: what a line that did not apply leaves. */
  readonly result?: number;
  readonly status?: OverrideStatus;
  /** The line's own label; by default, its entry's name. */
  readonly label?: ModifierLabel;
  /** Set on the character by a user rather than by content. */
  readonly manual?: boolean;
  /** Which rule element of its entry it is, for two on one entry. */
  readonly rule?: number;
}

export function override(entry: ContentId, options: OverrideOptions): OverrideLine {
  const { phase, mode, value, replaced, result = replaced, status, label, manual = false, rule = 0 } = options;
  return {
    id: ruleId(entry, rule),
    label: label ?? { entry },
    origin: manual ? byHand(entry) : origin(entry),
    phase,
    mode,
    value: value === undefined ? undefined : RuleNumber.parse(value),
    replaced: FormulaValue.parse(replaced),
    result: FormulaValue.parse(result),
    status: status ?? { kind: OverrideStatusKind.Applied },
  };
}

const GOLEM_FORM_AC = 18;
const EARLIER_RULING = 19;
const GM_RULING = 22;

/** Overrides on the fighter's AC: a form's `Change` not in effect, then a GM's set override replacing an earlier one. */
const AC_OVERRIDES: readonly OverrideLine[] = [
  override(GOLEM_FORM, {
    phase: OverridePhase.Base,
    mode: ChangeMode.Upgrade,
    value: GOLEM_FORM_AC,
    replaced: FIGHTER_AC.baseValue,
    status: { kind: OverrideStatusKind.Inactive, reason: InactiveReason.Predicate },
  }),
  override(OVERRIDES, {
    phase: OverridePhase.Total,
    mode: ChangeMode.Override,
    value: EARLIER_RULING,
    replaced: FIGHTER_AC.computed,
    status: { kind: OverrideStatusKind.Replaced, by: ruleId(OVERRIDES, 1) },
    label: { text: ContentText.parse('Earlier ruling') },
    manual: true,
  }),
  override(OVERRIDES, {
    phase: OverridePhase.Total,
    mode: ChangeMode.Override,
    value: GM_RULING,
    replaced: FIGHTER_AC.computed,
    result: GM_RULING,
    label: { text: ContentText.parse('Set by the GM') },
    manual: true,
    rule: 1,
  }),
];

/** The fighter's AC with a GM's set override pinning it to 22; computed, it is still 20. */
export const PINNED_AC: StatisticValue = statistic('ac', {
  base: FIGHTER_AC.base,
  lines: FIGHTER_AC.lines,
  overrides: AC_OVERRIDES,
});

/** The fighter's statistics with Armor Class pinned. */
export const PINNED_STATISTICS: readonly NamedStatistic[] = [
  { name: 'Armor Class', kind: StatisticKind.Dc, result: PINNED_AC },
  ...FIGHTER_STATISTICS.slice(1),
];

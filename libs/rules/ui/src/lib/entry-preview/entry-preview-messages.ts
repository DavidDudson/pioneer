import { EffectStatusKind } from '@pioneer/rules/engine';
import type { ConditionEnding } from '@pioneer/rules/sdk';

/** Message keys the entry preview renders with, spelled out so the key check sees them. */
export const EntryPreviewMessage = {
  Level: 'rules.entryPreview.level',
  Effects: 'rules.entryPreview.effects',
  /** The label of the rank pick. */
  CastAt: 'rules.entryPreview.castAt',
  /** "3rd rank": an option of the rank pick. */
  Rank: 'rules.entryPreview.rank',
  NoEffects: 'rules.entryPreview.noEffects',
  Effect: 'rules.entryPreview.effect',
  EffectMarked: 'rules.entryPreview.effectMarked',
  LoadFailed: 'rules.entryPreview.loadFailed',
  NotFound: 'rules.entryPreview.notFound',
  Open: 'rules.entryPreview.open',
  /** "Perception set to 20": a Change that pins a statistic. */
  EffectSet: 'rules.entryPreview.effectSet',
  /** "Gains Darkvision (precise, 60 feet)": a sense the entry gives, with its acuity and range if it has one. */
  EffectSense: 'rules.entryPreview.effectSense',
  /** A rule element the summary does not cover yet, with the element's name. */
  EffectNotSummarised: 'rules.entryPreview.effectNotSummarised',
  /** The heading over what each value of a condition means. */
  Values: 'rules.entryPreview.values',
  /** "Value 2": the label of one stage. */
  Stage: 'rules.entryPreview.stage',
  /** The heading over the ways a held condition ends. */
  Endings: 'rules.entryPreview.endings',
  /** "DC 12": a recovery check at the value the character holds. */
  EndingDc: 'rules.entryPreview.endingDc',
  /** "Fortitude +7": a statistic the recovery check may be rolled with, and the modifier the character rolls at. */
  EndingAgainst: 'rules.entryPreview.endingAgainst',
  /** Leads the action that ends a condition. */
  EndingAction: 'rules.entryPreview.endingAction',
  /** The heading over what the character has that ends or eases the condition. */
  EaseOptions: 'rules.entryPreview.easeOptions',
  /** "Lowers it by 2": what an option does to the condition. */
  EaseLower: 'rules.entryPreview.easeLower',
  /** "Removes it": what an option does to the condition. */
  EaseRemove: 'rules.entryPreview.easeRemove',
  /** "Counteracts it": what an option does where it states no rank. */
  EaseCounteract: 'rules.entryPreview.easeCounteract',
  /** "Counteracts it at 3rd rank": what an option does where it states a rank. */
  EaseCounteractRanked: 'rules.entryPreview.easeCounteractRanked',
  /** "2 left": how many casts, uses or items remain. */
  EaseLeft: 'rules.entryPreview.easeLeft',
  /** Marks an option the character cannot use now. */
  EaseUnavailable: 'rules.entryPreview.easeUnavailable',
} as const;

/** What each kind of ending is called over its text. */
export const ENDING_KIND_MESSAGES: Readonly<Record<ConditionEnding['kind'], string>> = {
  automatic: 'rules.entryPreview.endingKind.automatic',
  check: 'rules.entryPreview.endingKind.check',
  action: 'rules.entryPreview.endingKind.action',
  others: 'rules.entryPreview.endingKind.others',
  source: 'rules.entryPreview.endingKind.source',
};

/** The status a line that does not simply count is marked with. */
export type MarkedEffectStatus = Exclude<EffectStatusKind, typeof EffectStatusKind.Applied>;

export const EFFECT_STATUS_MESSAGES: Readonly<Record<MarkedEffectStatus, string>> = {
  [EffectStatusKind.Suppressed]: 'rules.breakdown.status.suppressed',
  [EffectStatusKind.Conditional]: 'rules.breakdown.status.conditional',
  [EffectStatusKind.Inactive]: 'rules.breakdown.status.inactive',
  [EffectStatusKind.Failed]: 'rules.breakdown.status.failed',
};

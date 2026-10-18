import { EffectStatusKind } from '@pioneer/rules/engine';

/** Message keys the entry preview renders with, spelled out so the key check sees them. */
export const EntryPreviewMessage = {
  Level: 'rules.entryPreview.level',
  Effects: 'rules.entryPreview.effects',
  NoEffects: 'rules.entryPreview.noEffects',
  Effect: 'rules.entryPreview.effect',
  EffectMarked: 'rules.entryPreview.effectMarked',
  LoadFailed: 'rules.entryPreview.loadFailed',
  NotFound: 'rules.entryPreview.notFound',
  Open: 'rules.entryPreview.open',
  /** "Perception set to 20": a Change that pins a statistic. */
  EffectSet: 'rules.entryPreview.effectSet',
  /** "Gains a sense": a sense the entry gives. */
  EffectSense: 'rules.entryPreview.effectSense',
  /** A rule element the summary does not cover yet, with the element's name. */
  EffectNotSummarised: 'rules.entryPreview.effectNotSummarised',
} as const;

/** The status a line that does not simply count is marked with. */
export type MarkedEffectStatus = Exclude<EffectStatusKind, typeof EffectStatusKind.Applied>;

export const EFFECT_STATUS_MESSAGES: Readonly<Record<MarkedEffectStatus, string>> = {
  [EffectStatusKind.Suppressed]: 'rules.breakdown.status.suppressed',
  [EffectStatusKind.Conditional]: 'rules.breakdown.status.conditional',
  [EffectStatusKind.Inactive]: 'rules.breakdown.status.inactive',
  [EffectStatusKind.Failed]: 'rules.breakdown.status.failed',
};

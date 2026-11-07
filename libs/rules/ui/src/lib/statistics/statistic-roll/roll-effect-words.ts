import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import { RollEffectStatusKind } from '@pioneer/rules/engine';
import type {
  DegreeAdjustment,
  DegreeAdjustmentLine,
  ModifierLabel,
  RollEffectStatus,
  RollTwiceLine,
} from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import { DegreeChange, RollKept } from '@pioneer/rules/sdk';

import { labelName, summaryFormat } from '../../breakdown/line-words';
import type { LabelNames } from '../../breakdown/line-words';
import { RollEffectMessage } from '../statistics-messages';

/** What words a roll effect: the translator, the locale's formats and the names of what lines come from. */
export interface RollEffectWords {
  readonly i18n: TranslocoService;
  readonly format: LocaleFormat;
  readonly names: LabelNames;
}

const CHANGE_MESSAGES: Readonly<Record<DegreeChange, RollEffectMessage>> = {
  [DegreeChange.OneDegreeBetter]: RollEffectMessage.OneDegreeBetter,
  [DegreeChange.OneDegreeWorse]: RollEffectMessage.OneDegreeWorse,
  [DegreeChange.TwoDegreesBetter]: RollEffectMessage.TwoDegreesBetter,
  [DegreeChange.TwoDegreesWorse]: RollEffectMessage.TwoDegreesWorse,
  [DegreeChange.ToCriticalSuccess]: RollEffectMessage.ToCriticalSuccess,
  [DegreeChange.ToSuccess]: RollEffectMessage.ToSuccess,
  [DegreeChange.ToFailure]: RollEffectMessage.ToFailure,
  [DegreeChange.ToCriticalFailure]: RollEffectMessage.ToCriticalFailure,
};

const DEGREE_MESSAGES: Readonly<Record<keyof DegreeAdjustment, RollEffectMessage>> = {
  all: RollEffectMessage.AllDegrees,
  criticalFailure: RollEffectMessage.CriticalFailure,
  failure: RollEffectMessage.Failure,
  success: RollEffectMessage.Success,
  criticalSuccess: RollEffectMessage.CriticalSuccess,
};

const DEGREE_ORDER = ['all', 'criticalFailure', 'failure', 'success', 'criticalSuccess'] as const;

/** One message, worded. */
function say({ i18n }: RollEffectWords, key: RollEffectMessage, params?: Readonly<Record<string, string>>): string {
  return i18n.translate(key, params);
}

/** What a line is called: its own text, else its entry's name. */
function nameOf(label: ModifierLabel, { i18n, names }: RollEffectWords): string {
  return labelName(label, names, (descriptor) => i18n.translate(descriptor.key, descriptor.params));
}

/** The text, followed by when it holds if the status is conditional ("... when your shield is raised"). */
function withStatus(text: string, status: RollEffectStatus, { i18n, format }: RollEffectWords): string {
  if (status.kind === RollEffectStatusKind.Applied) {
    return text;
  }
  const summary = status.summary === undefined ? undefined : formatSummary(status.summary, summaryFormat(i18n, format));
  return summary === undefined
    ? i18n.translate(RollEffectMessage.InSomeSituations, { text })
    : i18n.translate(RollEffectMessage.When, { text, summary });
}

/** "Fortune: roll twice, keep the higher (Hero Point)", with when it holds if it is conditional. */
export function rollTwiceText(line: RollTwiceLine, words: RollEffectWords): string {
  const name = nameOf(line.label, words);
  const key = line.keep === RollKept.Higher ? RollEffectMessage.Fortune : RollEffectMessage.Misfortune;
  return withStatus(say(words, key, { name }), line.status, words);
}

/** "Success: one degree better; failure: two degrees worse (Name)", with when it holds if it is conditional. */
export function degreeAdjustmentText(line: DegreeAdjustmentLine, words: RollEffectWords): string {
  const name = nameOf(line.label, words);
  const changes = DEGREE_ORDER.flatMap((degree) => {
    const change = line.adjustment[degree];
    if (change === undefined) {
      return [];
    }
    const degreeWords = say(words, DEGREE_MESSAGES[degree]);
    const changeWords = say(words, CHANGE_MESSAGES[change]);
    return [say(words, RollEffectMessage.Change, { degree: degreeWords, change: changeWords })];
  });
  const text = say(words, RollEffectMessage.Degree, { changes: words.format.list(changes), name });
  return withStatus(text, line.status, words);
}

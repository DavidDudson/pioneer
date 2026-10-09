/** Keys for rules text; their `en` text ships in this lib's `i18n/en.json` under `rules.*`. */
export const RulesMessage = {
  KeyFormat: 'rules.key.format',
  RollOptionFormat: 'rules.rollOption.format',
  PredicateTooDeep: 'rules.predicate.tooDeep',
  BookLocation: 'rules.source.bookLocation',
  AonUrl: 'rules.source.aonUrl',
  UnknownElement: 'rules.element.unknown',
  SuboptionsNeedToggle: 'rules.element.suboptionsNeedToggle',
  AdjustModeOrSuppress: 'rules.element.adjustModeOrSuppress',
  RankOrSameAs: 'rules.element.rankOrSameAs',
  MaxRankNeedsSameAs: 'rules.element.maxRankNeedsSameAs',
} as const;

export { type ArmorInputs, CHECK_PENALTY } from './armor-bonus';
export { type BaseTerm, BaseTermKind, TermSign } from './base-term';
export {
  type BreakdownLine,
  InactiveReason,
  type LabelName,
  LabelParam,
  type LineStatus,
  LineStatusKind,
  type Modifier,
  type ModifierLabel,
  type OverrideLine,
  OverridePhase,
  type OverrideStatus,
  OverrideStatusKind,
  SuppressionReason,
} from './breakdown';
export { deriveStatistics, type StatisticContent } from './derive-statistics';
export { damageTargetOf } from './damage-target';
export {
  damageDice,
  deriveStrikes,
  type MultipleAttackPenalty,
  multipleAttackPenalty,
  type Strike,
  type StrikeDamage,
} from './strikes';
export {
  type AdjustmentLine,
  type Defences,
  type DefenceStatus,
  DefenceStatusKind,
  deriveDefences,
  type ImmunityLine,
} from './defences';
export { statisticContent, variantRulesInPlay } from './statistic-content';
export { EngineMessage } from './messages';
export { type ModifierInputs, NO_SITUATION, RuleId, ruleIdOf, RuleInPlay } from './rule-in-play';
export { ranksInPlay } from './ranks-in-play';
export { type SpellAtRank, type SpellCast, spellAtRank } from './spell-at-rank';
export { type AncestryVision, type SenseInPlay, sensesInPlay } from './senses-in-play';
export {
  type RankSlots,
  type SlotPool,
  type SpellcastingInPlay,
  type SpellSlots,
  spellcastingInPlay,
} from './spellcasting-in-play';
export { type StatisticFailure, type StatisticResult, type StatisticValue } from './statistic-result';
export { type ClassInputs, type StatisticInputs, StatisticInputsJson } from './statistic-inputs';
export { type WeaponInputs } from './source-inputs';
export { default as engineMessages } from './i18n/en.json';
export { rollSituation, type RollSituation } from './roll-situation';
export {
  type RecoveryInPlay,
  type SizeInPlay,
  type TemporaryHitPointsInPlay,
  type VitalsInPlay,
  type VitalsScope,
  vitalsInPlay,
} from './vitals-in-play';

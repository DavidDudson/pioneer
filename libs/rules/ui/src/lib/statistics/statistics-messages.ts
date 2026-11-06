/** Message keys the statistics list renders with, spelled out so the key check sees them. */
export const StatisticsMessage = {
  None: 'rules.statistics.none',
  /** An empty list of Strikes. */
  NoStrikes: 'rules.statistics.noStrikes',
  /** A fist's Strike, which no content names. */
  Fist: 'rules.statistics.fist',
  Failed: 'rules.statistics.failed',
  /** The marker on a total a user added a modifier to by hand. */
  Adjusted: 'rules.statistics.adjusted',
  /** A total a set override pinned. */
  Pinned: 'rules.statistics.pinned',
  /** "computed 18": the total before a set override pinned it. */
  Computed: 'rules.statistics.computed',
  /** "+2 circumstance when your shield is raised (Steel Shield)": a conditional line beside the total. */
  Conditional: 'rules.statistics.conditional',
  /** "from Plant Form": what a battle form sets the statistic from. */
  FromForm: 'rules.statistics.fromForm',
  /** The label of the button that rolls a check: "Roll Perception +10", which holds the text the button shows. */
  Roll: 'rules.statistics.roll',
} as const;

/** Message keys that word what changes how a check rolls, spelled out so the key check sees them. */
export const RollEffectMessage = {
  /** "Fortune: roll twice, keep the higher ({name})". */
  Fortune: 'rules.statistics.rollEffects.fortune',
  Misfortune: 'rules.statistics.rollEffects.misfortune',
  /** "Success: one degree better ({name})": the changes listed, then what gives them. */
  Degree: 'rules.statistics.rollEffects.degree',
  /** "success: one degree better": one degree and how it changes. */
  Change: 'rules.statistics.rollEffects.change',
  /** "{text} when {summary}". */
  When: 'rules.statistics.rollEffects.when',
  InSomeSituations: 'rules.statistics.rollEffects.inSomeSituations',
  AllDegrees: 'rules.statistics.rollEffects.degrees.all',
  CriticalFailure: 'rules.statistics.rollEffects.degrees.criticalFailure',
  Failure: 'rules.statistics.rollEffects.degrees.failure',
  Success: 'rules.statistics.rollEffects.degrees.success',
  CriticalSuccess: 'rules.statistics.rollEffects.degrees.criticalSuccess',
  OneDegreeBetter: 'rules.statistics.rollEffects.changes.oneDegreeBetter',
  OneDegreeWorse: 'rules.statistics.rollEffects.changes.oneDegreeWorse',
  TwoDegreesBetter: 'rules.statistics.rollEffects.changes.twoDegreesBetter',
  TwoDegreesWorse: 'rules.statistics.rollEffects.changes.twoDegreesWorse',
  ToCriticalSuccess: 'rules.statistics.rollEffects.changes.toCriticalSuccess',
  ToSuccess: 'rules.statistics.rollEffects.changes.toSuccess',
  ToFailure: 'rules.statistics.rollEffects.changes.toFailure',
  ToCriticalFailure: 'rules.statistics.rollEffects.changes.toCriticalFailure',
  /** The label added to a roll button's name when something conditional would change it. */
  Conditional: 'rules.statistics.rollEffects.conditionalMark',
} as const;
export type RollEffectMessage = (typeof RollEffectMessage)[keyof typeof RollEffectMessage];

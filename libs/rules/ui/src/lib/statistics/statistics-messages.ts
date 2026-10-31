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
  /** The label of the button that rolls a check: "Roll Perception". */
  Roll: 'rules.statistics.roll',
  /** The link that opens the form to adjust a statistic by hand. */
  Adjust: 'rules.statistics.adjust',
  /** "Adjust Perception": the accessible name of that link. */
  AdjustLabel: 'rules.statistics.adjustLabel',
  /** The link that opens the form to set a statistic by hand. */
  Set: 'rules.statistics.set',
  /** "Set Perception": the accessible name of that link. */
  SetLabel: 'rules.statistics.setLabel',
} as const;

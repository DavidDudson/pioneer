/** Message keys the statistics list renders with, spelled out so the key check sees them. */
export const StatisticsMessage = {
  None: 'rules.statistics.none',
  /** An empty list of Strikes. */
  NoStrikes: 'rules.statistics.noStrikes',
  /** A fist's Strike, which no content names. */
  Fist: 'rules.statistics.fist',
  Failed: 'rules.statistics.failed',
  /** A total a set override pinned. */
  Pinned: 'rules.statistics.pinned',
  /** "computed 18": the total before a set override pinned it. */
  Computed: 'rules.statistics.computed',
  /** "+2 circumstance when your shield is raised (Steel Shield)": a conditional line beside the total. */
  Conditional: 'rules.statistics.conditional',
} as const;

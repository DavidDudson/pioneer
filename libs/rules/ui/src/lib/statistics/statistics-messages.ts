/** Message keys the statistics list renders with, spelled out so the key check sees them. */
export const StatisticsMessage = {
  None: 'rules.statistics.none',
  Failed: 'rules.statistics.failed',
  /** A total a set override pinned. */
  Pinned: 'rules.statistics.pinned',
  /** "computed 18": the total before a set override pinned it. */
  Computed: 'rules.statistics.computed',
} as const;

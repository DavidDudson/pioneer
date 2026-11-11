/** One value a spell filter can pick, with how many spells picking it would leave. */
export interface SpellFilterOption {
  /** What the URL and the picks carry: stable for the value, not worded. */
  readonly value: string;
  /** The value worded for the viewer ("Single target", "fire"). */
  readonly label: string;
  readonly count: number;
}

/** One property the spell list can be filtered by (target, trait, damage type, action cost, source). */
export interface SpellFilterGroup {
  readonly id: string;
  /** The property worded ("Targets", "Source"). */
  readonly label: string;
  readonly options: readonly SpellFilterOption[];
  /** The values picked; one the options no longer hold is still listed, so it can be cleared. */
  readonly selected: ReadonlySet<string>;
}

/** The new picks of one group, after the player toggled a value. */
export interface SpellFilterChange {
  readonly group: string;
  readonly selected: ReadonlySet<string>;
}

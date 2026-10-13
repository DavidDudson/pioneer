import type { Level } from '@pioneer/rules/sdk';

import type { ChoiceLine } from '../choices/choice-line';

/** One level of the timeline: what it opens, each with what is picked, and whether it is the character's level. */
export interface LevelTimelineRow {
  readonly level: Level;
  /** The character's level, marked in text. */
  readonly current: boolean;
  readonly lines: readonly ChoiceLine[];
}

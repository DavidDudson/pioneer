import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { List, ListItem, Skeleton } from '@pioneer/frontier';

import { LevelTimelineLevel } from './level-timeline-level/level-timeline-level.component';
import type { LevelTimelineRow } from './level-timeline-row';

const LOADING_ROWS = 3;

/**
 * One row per level from 1 to 20: what the level opens (feats, boosts, skill increases) and what is picked there. The
 * character's level is marked in text, and a slot with nothing picked says so through its row.
 *
 * Read-only and presentational (ADR-0028): the caller turns the character's slots into rows, or passes undefined
 * while they load.
 *
 * ```html
 * <pio-level-timeline [rows]="timelineRows()" />
 * ```
 */
@Component({
  selector: 'pio-level-timeline',
  imports: [LevelTimelineLevel, List, ListItem, Skeleton],
  templateUrl: './level-timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimeline {
  /** The levels in order, or undefined while they load. */
  public readonly rows = input<readonly LevelTimelineRow[] | undefined>();

  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}

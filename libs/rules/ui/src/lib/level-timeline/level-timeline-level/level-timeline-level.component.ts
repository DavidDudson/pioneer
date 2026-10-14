import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';

import { ChoiceRow } from '../../choices/choice-row/choice-row.component';
import { LevelTimelineMessage } from '../level-timeline-messages';
import { LevelTimelinePick } from '../level-timeline-pick/level-timeline-pick.component';
import type { LevelTimelineRow, TimelinePick } from '../level-timeline-row';

/**
 * One level of the timeline: its heading, a text mark when it is the character's level, and what it opens, a planned
 * slot with a picker when the caller offers one.
 */
@Component({
  selector: 'pio-level-timeline-level',
  imports: [Badge, ChoiceRow, Heading, LevelTimelinePick, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './level-timeline-level.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelineLevel {
  public readonly row = input.required<LevelTimelineRow>();

  protected readonly Message = LevelTimelineMessage;
  protected readonly BadgeTone = BadgeTone;

  /** The picker of the slot `key`, if it has one. */
  protected pickOf(key: SlotKey): TimelinePick | undefined {
    return this.row().picks.find((each) => each.key === key);
  }
}

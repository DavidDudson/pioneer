import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { ChoiceRow } from '../../choices/choice-row/choice-row.component';
import { LevelTimelineMessage } from '../level-timeline-messages';
import type { LevelTimelineRow } from '../level-timeline-row';

/** One level of the timeline: its heading, a text mark when it is the character's level, and what it opens. */
@Component({
  selector: 'pio-level-timeline-level',
  imports: [Badge, ChoiceRow, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './level-timeline-level.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelineLevel {
  public readonly row = input.required<LevelTimelineRow>();

  protected readonly Message = LevelTimelineMessage;
  protected readonly BadgeTone = BadgeTone;
}

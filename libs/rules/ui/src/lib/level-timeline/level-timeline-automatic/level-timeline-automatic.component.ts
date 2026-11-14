import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, Stack, Text } from '@pioneer/frontier';

import { LevelTimelineMessage } from '../level-timeline-messages';
import type { AutomaticLine } from '../level-timeline-row';

/** What a level improves by itself: read-only lines under the level's choices, each with its source. */
@Component({
  selector: 'pio-level-timeline-automatic',
  imports: [List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './level-timeline-automatic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelineAutomatic {
  public readonly lines = input.required<readonly AutomaticLine[]>();

  protected readonly Message = LevelTimelineMessage;
}

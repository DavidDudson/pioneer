import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';

import { ChoiceState } from '../../choices/choice-line';
import { ChoiceRow } from '../../choices/choice-row/choice-row.component';
import { LevelTimelineAutomatic } from '../level-timeline-automatic/level-timeline-automatic.component';
import { LevelTimelineMessage } from '../level-timeline-messages';
import { LevelTimelinePick } from '../level-timeline-pick/level-timeline-pick.component';
import type { AutomaticLine, LevelTimelineRow, TimelinePick } from '../level-timeline-row';

/**
 * One level of the timeline: its heading, a text mark when it is the character's level, a warning when a pick at the
 * level breaks, and what it opens, a planned slot with a picker when the caller offers one.
 */
@Component({
  selector: 'pio-level-timeline-level',
  imports: [
    Badge,
    ChoiceRow,
    Heading,
    LevelTimelineAutomatic,
    LevelTimelinePick,
    List,
    ListItem,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './level-timeline-level.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelineLevel {
  public readonly row = input.required<LevelTimelineRow>();

  protected readonly Message = LevelTimelineMessage;
  /** Whether a pick planned or held for this level no longer holds there (#493); its reason shows on the slot. */
  protected readonly breaks = computed(() => this.row().lines.some((line) => line.state === ChoiceState.Invalid));
  protected readonly BadgeTone = BadgeTone;
  /** Whether the level opens nothing and improves nothing. */
  protected readonly empty = computed((): boolean => this.row().lines.length === 0 && this.automatic().length === 0);
  /** What the level improves by itself; empty when the list gives none. */
  protected readonly automatic = computed((): readonly AutomaticLine[] => this.row().automatic ?? []);

  /** The picker of the slot `key`, if it has one. */
  protected pickOf(key: SlotKey): TimelinePick | undefined {
    return this.row().picks.find((each) => each.key === key);
  }
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Heading, InlineField, List, ListItem, Select, Stack, Text } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import type { SlotKey } from '@pioneer/rules/sdk';

import { ChoiceRow } from '../../choices/choice-row/choice-row.component';
import { LevelTimelineMessage } from '../level-timeline-messages';
import { TimelinePickKind } from '../level-timeline-row';
import type { LevelTimelineRow, TimelineCombobox, TimelineSelect } from '../level-timeline-row';

/**
 * One level of the timeline: its heading, a text mark when it is the character's level, and what it opens, a planned
 * slot with a picker when the caller offers one.
 */
@Component({
  selector: 'pio-level-timeline-level',
  imports: [Badge, ChoiceRow, Combobox, Heading, InlineField, List, ListItem, Select, Stack, Text, TranslocoPipe],
  templateUrl: './level-timeline-level.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelineLevel {
  public readonly row = input.required<LevelTimelineRow>();

  protected readonly Message = LevelTimelineMessage;
  protected readonly BadgeTone = BadgeTone;

  /** The list picker of the slot `key`, if it has one. */
  protected selectOf(key: SlotKey): TimelineSelect | undefined {
    const pick = this.row().picks.find((each) => each.key === key);
    return pick?.kind === TimelinePickKind.Select ? pick : undefined;
  }

  /** The search picker of the slot `key`, if it has one. */
  protected comboboxOf(key: SlotKey): TimelineCombobox | undefined {
    const pick = this.row().picks.find((each) => each.key === key);
    return pick?.kind === TimelinePickKind.Combobox ? pick : undefined;
  }
}

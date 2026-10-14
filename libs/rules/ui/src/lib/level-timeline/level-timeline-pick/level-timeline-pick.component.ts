import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { InlineField } from '@pioneer/frontier';

import { FeatPicker } from '../../feat-picker/feat-picker.component';
import { AttributePicker } from '../../slot-picker/attribute-picker.component';
import { SkillPicker } from '../../slot-picker/skill-picker.component';
import { LevelTimelineMessage } from '../level-timeline-messages';
import { TimelinePickKind } from '../level-timeline-row';
import type { TimelinePick } from '../level-timeline-row';

/** The inline table that plans one slot ahead: a skill's, a boost's or a feat's, by the kind of the pick. */
@Component({
  selector: 'pio-level-timeline-pick',
  imports: [AttributePicker, FeatPicker, InlineField, SkillPicker, TranslocoPipe],
  templateUrl: './level-timeline-pick.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelTimelinePick {
  public readonly pick = input.required<TimelinePick>();

  protected readonly Message = LevelTimelineMessage;
  protected readonly Kind = TimelinePickKind;
}

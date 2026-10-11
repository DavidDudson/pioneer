import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, InlineField, Select } from '@pioneer/frontier';

import type { SkillField } from '../sheet-build-picks';

/**
 * The skill pickers on the sheet: one inline edit per trained skill and skill increase up to the character's level,
 * each offering the skills it may train or raise. None before a class is picked.
 */
@Component({
  selector: 'pio-sheet-skill-fields',
  imports: [Grid, InlineField, Select, TranslocoPipe],
  templateUrl: './sheet-skill-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSkillFields {
  public readonly fields = input.required<readonly SkillField[]>();
}

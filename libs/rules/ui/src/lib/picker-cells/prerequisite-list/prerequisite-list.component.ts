import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideCheck, LucideX } from '@lucide/angular';
import { Glyph, Icon, List, ListItem, Stack, Text, Tone } from '@pioneer/frontier';

import { PickerCellMessage } from '../picker-cell-messages';

/** One prerequisite: its text, already translated, and whether the character meets it. */
export interface PrerequisiteLine {
  readonly label: string;
  readonly met: boolean;
}

/**
 * A feat's prerequisites, each with a tick when the character meets it and a cross when not. A screen reader says
 * "Met: Trained in Athletics" or "Not met: Trained in Athletics".
 *
 * ```html
 * <pio-prerequisite-list [prerequisites]="row.prerequisites" />
 * ```
 */
@Component({
  selector: 'pio-prerequisite-list',
  imports: [Glyph, Icon, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './prerequisite-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrerequisiteList {
  public readonly prerequisites = input.required<readonly PrerequisiteLine[]>();

  protected readonly Message = PickerCellMessage;
  protected readonly Tone = Tone;
  protected readonly Met = LucideCheck;
  protected readonly Unmet = LucideX;
}

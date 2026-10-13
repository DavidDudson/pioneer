import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideCheck, LucideCircleQuestionMark, LucideX } from '@lucide/angular';
import { Glyph, Icon, List, ListItem, Stack, Text, Tone } from '@pioneer/frontier';

import { PickerCellMessage } from '../picker-cell-messages';

/** Whether the character meets a prerequisite; unknown when it can't be checked, which is never read as not met (ADR-0002). */
export const PrerequisiteState = { Met: 'met', Unmet: 'unmet', Unknown: 'unknown' } as const;
export type PrerequisiteState = (typeof PrerequisiteState)[keyof typeof PrerequisiteState];

/** One prerequisite: its text, already translated, and whether the character meets it. */
export interface PrerequisiteLine {
  readonly label: string;
  readonly state: PrerequisiteState;
}

/** What each state shows: its icon, the tone of the icon and of the text, and the words a screen reader says. */
const STATE_VIEWS = {
  [PrerequisiteState.Met]: {
    icon: LucideCheck,
    iconTone: Tone.Success,
    textTone: Tone.Default,
    spoken: PickerCellMessage.PrerequisiteMet,
  },
  [PrerequisiteState.Unmet]: {
    icon: LucideX,
    iconTone: Tone.Danger,
    textTone: Tone.Danger,
    spoken: PickerCellMessage.PrerequisiteUnmet,
  },
  [PrerequisiteState.Unknown]: {
    icon: LucideCircleQuestionMark,
    iconTone: Tone.Muted,
    textTone: Tone.Muted,
    spoken: PickerCellMessage.PrerequisiteUnknown,
  },
} as const;

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
  protected readonly views = STATE_VIEWS;
}

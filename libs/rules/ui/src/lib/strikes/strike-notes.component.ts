import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack, Text } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';

/** A note a rule element puts on a roll, as shown. */
export interface ShownNote {
  readonly title: string | undefined;
  /** "On a critical success": the degrees it shows on; undefined for every degree. */
  readonly when: string | undefined;
  readonly text: RichText;
}

/** The notes rule elements put on one roll of a Strike: each with its title, the degrees it shows on, and its text. */
@Component({
  selector: 'pio-strike-notes',
  imports: [RichTextView, Stack, Text],
  templateUrl: './strike-notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrikeNotes {
  public readonly notes = input.required<readonly ShownNote[]>();
}

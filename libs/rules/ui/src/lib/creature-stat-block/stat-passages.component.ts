import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HeadingLevel, Stack, Text } from '@pioneer/frontier';

import { RichTextView } from '../rich-text/rich-text.component';
import type { StatPassage } from './creature-stat-block';

/** Labelled passages of rules text, such as a stat block's Recall Knowledge. */
@Component({
  selector: 'pio-stat-passages',
  imports: [RichTextView, Stack, Text],
  templateUrl: './stat-passages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatPassagesView {
  public readonly passages = input.required<readonly StatPassage[]>();
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);
}

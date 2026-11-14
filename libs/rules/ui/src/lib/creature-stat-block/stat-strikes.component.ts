import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HeadingLevel, Stack, Text } from '@pioneer/frontier';

import { RichTextView } from '../rich-text/rich-text.component';
import { TraitChip } from '../trait-chip/trait-chip.component';
import type { StrikeLine } from './creature-stat-block';
import { StatLinesView } from './stat-lines.component';

/** The Strikes of a stat block: the attack, its traits, its damage and the prose after it. */
@Component({
  selector: 'pio-stat-strikes',
  imports: [RichTextView, StatLinesView, Stack, Text, TraitChip],
  templateUrl: './stat-strikes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatStrikesView {
  public readonly strikes = input.required<readonly StrikeLine[]>();
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);
}

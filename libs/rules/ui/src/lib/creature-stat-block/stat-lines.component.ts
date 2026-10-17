import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack, Text } from '@pioneer/frontier';

import type { StatLine } from './creature-stat-block';

/** Labelled lines of a stat block ("AC 17", "Languages Common, Goblin"), one paragraph each. */
@Component({
  selector: 'pio-stat-lines',
  imports: [Stack, Text],
  templateUrl: './stat-lines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatLinesView {
  public readonly lines = input.required<readonly StatLine[]>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack, Surface, Text } from '@pioneer/frontier';

import type { RollView } from '../roll-view';

/** One finished roll: its expression and total, then each term with the dice behind it. */
@Component({
  selector: 'pio-roll-card',
  imports: [Heading, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './roll-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollCard {
  public readonly roll = input.required<RollView>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';

/** The toggles a roll was made with, worded, under a heading; nothing when it was made with none. */
@Component({
  selector: 'pio-roll-reasons',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './roll-reasons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollReasons {
  public readonly reasons = input.required<readonly string[]>();
}

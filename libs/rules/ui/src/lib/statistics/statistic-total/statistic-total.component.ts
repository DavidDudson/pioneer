import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Text } from '@pioneer/frontier';

import { StatisticsMessage } from '../statistics-messages';

/**
 * A statistic's total in its summary, already formatted; when a set override pinned it, marked pinned in text with
 * the computed value beside it ("22 Pinned computed 20").
 */
@Component({
  selector: 'pio-statistic-total',
  imports: [Badge, Text, TranslocoPipe],
  templateUrl: './statistic-total.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticTotal {
  public readonly total = input.required<string>();
  /** "computed 20" when a set override pinned the total; undefined otherwise. */
  public readonly computed = input<string | undefined>(undefined);

  /** "from Plant Form" when a battle form sets the total; undefined otherwise. */
  public readonly fromForm = input<string | undefined>(undefined);

  protected readonly Pinned = StatisticsMessage.Pinned;
}

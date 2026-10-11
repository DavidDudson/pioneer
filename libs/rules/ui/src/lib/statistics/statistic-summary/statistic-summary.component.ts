import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack, Text } from '@pioneer/frontier';

import { StatisticTotal } from '../statistic-total/statistic-total.component';

/**
 * A statistic's summary, already worded: its name and total, then each line that applies only in some situations
 * ("+2 circumstance when your shield is raised (Steel Shield)").
 */
@Component({
  selector: 'pio-statistic-summary',
  imports: [Stack, StatisticTotal, Text],
  templateUrl: './statistic-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticSummary {
  public readonly name = input.required<string>();
  public readonly total = input.required<string>();
  /** "computed 20" when a set override pinned the total; undefined otherwise. */
  public readonly computed = input<string | undefined>(undefined);
  public readonly conditions = input<readonly string[]>([]);
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, Heading, List, ListItem, Skeleton } from '@pioneer/frontier';

import { RulesResult } from '../rules-result/rules-result.component';
import { StatisticRow } from '../statistic-row/statistic-row.component';
import { StatisticsStatus } from '../statistics-check';
import type { StatisticsCheck } from '../statistics-check';

/**
 * Each statistic's base, term by term, and its total; or its error, pointing into its base formula. Problems with
 * the definitions or inputs show instead, and a skeleton while the proficiency rules load.
 */
@Component({
  selector: 'pio-statistics-result',
  imports: [EmptyState, Heading, List, ListItem, RulesResult, Skeleton, StatisticRow, TranslocoPipe],
  templateUrl: './statistics-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsResult {
  protected readonly StatisticsStatus = StatisticsStatus;
  public readonly check = input.required<StatisticsCheck>();
}

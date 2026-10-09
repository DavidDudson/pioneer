import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, List, ListItem, Text } from '@pioneer/frontier';

import { RulesResult } from '../rules-result/rules-result.component';
import { StatisticRow } from '../statistic-row/statistic-row.component';
import { StatisticsStatus } from '../statistics-check';
import type { StatisticsCheck } from '../statistics-check';

/**
 * Each statistic's base, term by term, and its total; or its error, pointing into its base formula. Problems with
 * the definitions or inputs show instead.
 */
@Component({
  selector: 'pio-statistics-result',
  imports: [Heading, List, ListItem, RulesResult, StatisticRow, Text, TranslocoPipe],
  templateUrl: './statistics-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsResult {
  protected readonly StatisticsStatus = StatisticsStatus;
  public readonly check = input.required<StatisticsCheck>();
}

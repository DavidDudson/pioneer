import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack, Text } from '@pioneer/frontier';

/**
 * A statistic's lines that apply only in some situations, already worded, under its summary ("+2 circumstance when
 * your shield is raised (Steel Shield)"). Outside the disclosure's trigger, so they do not become part of its name.
 */
@Component({
  selector: 'pio-statistic-conditions',
  imports: [Stack, Text],
  templateUrl: './statistic-conditions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticConditions {
  public readonly conditions = input.required<readonly string[]>();
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';
import type { FrequencyPeriod } from '@pioneer/rules/sdk';

import { ActionsMessage, RechargeMessage } from './actions-messages';

/**
 * The note in an action's hover summary saying when a spent action can be used again, worded from the period its
 * frequency refreshes over. Shows nothing for an action that can be used now.
 *
 * ```html
 * <pio-action-recharge [period]="line.recharge" />
 * ```
 */
@Component({
  selector: 'pio-action-recharge',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './action-recharge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionRecharge {
  public readonly period = input<FrequencyPeriod | undefined>();

  protected readonly label = ActionsMessage.SummaryRecharge;
  /** The key of the wording for the period; absent when there is no period. */
  protected readonly note = computed((): string | undefined => {
    const period = this.period();
    return period === undefined ? undefined : RechargeMessage[period];
  });
}

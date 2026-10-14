import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideDices } from '@lucide/angular';
import { Button, ButtonVariant, Icon, Size } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';

import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticsMessage } from '../statistics-messages';

/**
 * A button that rolls one check, beside its total. Shown only where the page provides a `STATISTIC_ROLLER`; the
 * button names the check it rolls for screen readers ("Roll Perception").
 *
 * ```html
 * <pio-statistic-roll [name]="'Perception'" [statistic]="result" />
 * ```
 */
@Component({
  selector: 'pio-statistic-roll',
  imports: [Button, Icon, TranslocoPipe],
  templateUrl: './statistic-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticRoll {
  public readonly name = input.required<string>();
  public readonly statistic = input.required<StatisticValue>();
  /** Only a check is rolled; a DC or a value shows no button. */
  public readonly kind = input.required<StatisticKind>();

  protected readonly roller = inject(STATISTIC_ROLLER, { optional: true });
  protected readonly Message = StatisticsMessage;
  protected readonly Dices = LucideDices;
  protected readonly Check = StatisticKind.Check;
  protected readonly ghost = ButtonVariant.Ghost;
  protected readonly small = Size.Sm;

  protected roll(): void {
    this.roller?.roll({ name: this.name(), statistic: this.statistic() });
  }
}

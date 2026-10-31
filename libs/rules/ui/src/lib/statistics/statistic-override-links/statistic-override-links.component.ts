import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Stack } from '@pioneer/frontier';
import type { Selector } from '@pioneer/rules/sdk';

import type { StatisticLink } from '../../entry-preview/entry-preview';
import { STATISTIC_OVERRIDES, StatisticOverrideMode } from '../statistic-overrides';
import { StatisticsMessage } from '../statistics-messages';

/** Where the link of a mode goes when the page provides no overrides: nowhere, as nothing renders then. */
const NOWHERE: StatisticLink = { to: [] };

/**
 * Adjust and Set, beside a statistic's total: links to the page's override form for it. Shown only where the page
 * provides `STATISTIC_OVERRIDES`; each names the statistic for screen readers ("Adjust Perception").
 *
 * ```html
 * <pio-statistic-override-links [name]="'Perception'" [selector]="'perception'" />
 * ```
 */
@Component({
  selector: 'pio-statistic-override-links',
  imports: [Link, Stack, TranslocoPipe],
  templateUrl: './statistic-override-links.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticOverrideLinks {
  public readonly name = input.required<string>();
  public readonly selector = input.required<Selector>();

  protected readonly overrides = inject(STATISTIC_OVERRIDES, { optional: true });
  protected readonly Message = StatisticsMessage;
  protected readonly adjustLink = computed(
    (): StatisticLink => this.overrides?.link(this.selector(), StatisticOverrideMode.Adjust) ?? NOWHERE,
  );
  protected readonly setLink = computed(
    (): StatisticLink => this.overrides?.link(this.selector(), StatisticOverrideMode.Set) ?? NOWHERE,
  );
}

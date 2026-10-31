import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, HoverCard, HoverCardContent, LocaleFormat, Size, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { BreakdownView } from '../../breakdown/breakdown.component';
import { SIGNED } from '../../breakdown/number-style';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticsMessage } from '../statistics-messages';

/**
 * A text button that rolls one check: the modifier it rolls ("+10") is the label, in one colour on a muted background,
 * never an icon. Hovering or focusing it opens the breakdown of that modifier. Shown only where the page provides a
 * `STATISTIC_ROLLER`; the button names the check it rolls for screen readers ("Roll Perception").
 *
 * ```html
 * <pio-statistic-roll [name]="'Perception'" [statistic]="result" />
 * ```
 */
@Component({
  selector: 'pio-statistic-roll',
  imports: [BreakdownView, Button, HoverCard, HoverCardContent, Text, TranslocoPipe],
  templateUrl: './statistic-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticRoll {
  public readonly name = input.required<string>();
  public readonly statistic = input.required<StatisticValue>();
  /** Only a check is rolled; a DC or a value shows no button. */
  public readonly kind = input.required<StatisticKind>();
  /** Display names of the entries the breakdown's lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown's origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly roller = inject(STATISTIC_ROLLER, { optional: true });
  readonly #format = inject(LocaleFormat);
  protected readonly Message = StatisticsMessage;
  protected readonly Check = StatisticKind.Check;
  protected readonly outline = ButtonVariant.OutlineSubtle;
  protected readonly small = Size.Sm;
  /** The modifier the roll adds, signed: "+10". */
  protected readonly label = computed(() => this.#format.number(this.statistic().total, SIGNED));

  protected roll(): void {
    this.roller?.roll({ name: this.name(), statistic: this.statistic() });
  }
}

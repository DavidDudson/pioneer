import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, LocaleFormat, Meter, Skeleton, Stack, Text } from '@pioneer/frontier';

import { BulkStatus } from './carried-bulk';
import type { CarriedBulk } from './carried-bulk';

/** Message keys the Bulk meter renders with, spelled out so the key check sees them. */
const BulkMessage = {
  Meter: 'rules.bulk.meter',
  Carried: 'rules.bulk.carried',
  Limits: 'rules.bulk.limits',
} as const;

interface StatusBadge {
  readonly message: string;
  readonly tone: BadgeTone;
}

/** The badge each status shows: none unencumbered, else what it is called and its tone. */
const STATUS_BADGES: Readonly<Record<BulkStatus, StatusBadge | undefined>> = {
  [BulkStatus.Unencumbered]: undefined,
  [BulkStatus.Encumbered]: { message: 'rules.bulk.status.encumbered', tone: BadgeTone.Warning },
  [BulkStatus.OverMaximum]: { message: 'rules.bulk.status.overMaximum', tone: BadgeTone.Danger },
};

const LIGHT_PER_BULK = 10;
const BEST = 0;

/** The Bulk as shown: whole Bulk for the meter, the words' numbers formatted, and the badge when it is over. */
interface ShownBulk {
  readonly whole: number;
  readonly encumberedAfter: number;
  readonly maximum: number;
  readonly carried: Readonly<Record<string, string | number>>;
  readonly limits: Readonly<Record<string, string>>;
  readonly badge: StatusBadge | undefined;
}

/**
 * The Bulk a character carries against its limits: a meter of whole Bulk up to the maximum, warning once it is
 * encumbered, the Bulk carried and the limits in words, and a badge while it is encumbered or over its maximum.
 *
 * Presentational (ADR-0028): the caller works out the Bulk and limits, or passes undefined while they load.
 *
 * ```html
 * <pio-bulk [bulk]="{ carried: 63, encumberedAfter: 7, maximum: 12, status: 'unencumbered' }" />
 * ```
 */
@Component({
  selector: 'pio-bulk',
  imports: [Badge, Meter, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './bulk.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkView {
  public readonly bulk = input<CarriedBulk | undefined>();

  protected readonly Message = BulkMessage;
  protected readonly best = BEST;

  readonly #format = inject(LocaleFormat);

  protected readonly shown = computed((): ShownBulk | undefined => {
    const bulk = this.bulk();
    if (bulk === undefined) {
      return undefined;
    }
    this.#format.locale();
    const whole = Math.floor(bulk.carried / LIGHT_PER_BULK);
    const light = bulk.carried % LIGHT_PER_BULK;
    return {
      whole,
      encumberedAfter: bulk.encumberedAfter,
      maximum: bulk.maximum,
      carried: { whole: this.#format.number(whole), light },
      limits: {
        encumberedAfter: this.#format.number(bulk.encumberedAfter),
        maximum: this.#format.number(bulk.maximum),
      },
      badge: STATUS_BADGES[bulk.status],
    };
  });
}

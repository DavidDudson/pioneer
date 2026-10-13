import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Disclosure, Stack, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { BreakdownView } from '../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticTotal } from '../statistics/statistic-total/statistic-total.component';
import { StatisticsMessage } from '../statistics/statistics-messages';
import { StrikesMessage } from './strikes-messages';

/** A Strike's attack roll as shown: its total and breakdown, or why it has none. */
export type ShownAttack =
  | {
      readonly ok: true;
      readonly total: string;
      /** "computed 18" when a set override pinned the total; undefined otherwise. */
      readonly computed: string | undefined;
      readonly statistic: StatisticValue;
    }
  | { readonly ok: false; readonly error: string };

/** An attack the engine derived. */
export type DerivedAttack = Extract<ShownAttack, { readonly ok: true }>;

/** One Strike as shown. */
export interface ShownStrike {
  readonly key: string;
  readonly name: string;
  readonly attack: ShownAttack;
  /** "1d8+4 slashing"; the none message for a weapon that rolls no damage. */
  readonly damage: string;
  /** The flat damage statistic's breakdown, when it derived. */
  readonly bonus: StatisticValue | undefined;
  /** "Multiple attack penalty -5 / -10". */
  readonly penalty: string;
}

/**
 * One Strike of the list (`pio-strikes`): its name and attack modifier, which expands in place to the attack roll's
 * breakdown and the damage bonus's, with its damage roll and multiple attack penalty beneath. An attack the engine
 * could not derive is marked failed in text, with why. Presentational (ADR-0028): the list formats everything.
 */
@Component({
  selector: 'pio-strike-row',
  imports: [Badge, BreakdownView, Disclosure, Stack, StatisticTotal, Text, TranslocoPipe],
  templateUrl: './strike-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrikeRow {
  public readonly row = input.required<ShownStrike>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Message = StrikesMessage;
  protected readonly Statistics = StatisticsMessage;
  protected readonly attackKind = StatisticKind.Check;
  protected readonly bonusKind = StatisticKind.Value;

  /** The attack when the engine derived it. */
  protected readonly derived = computed((): DerivedAttack | undefined => {
    const { attack } = this.row();
    return attack.ok ? attack : undefined;
  });

  /** Why it has no attack, when it has none. */
  protected readonly failure = computed((): string | undefined => {
    const { attack } = this.row();
    return attack.ok ? undefined : attack.error;
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Skeleton, Stack, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { Attribute, StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { ATTRIBUTE_MESSAGES, ATTRIBUTE_SHORT_MESSAGES } from '../attributes/attributes-messages';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';

/** One row: the attribute's name key and its check, unset while the statistics load. */
interface AttributeRow {
  readonly attribute: Attribute;
  readonly name: string;
  readonly shortName: string;
  readonly statistic: StatisticValue | undefined;
}

/**
 * The attributes (six unless `attributes` narrows them) as rows, each its name on the left and its check on the right
 * as a roll button: a d20 plus the attribute's modifier, coloured and marked like any other roll by what the character
 * has that reaches it (a bonus or penalty, fortune or misfortune, a shifted degree of success, a conditional line).
 * The page rolls the dice through `STATISTIC_ROLLER` (ADR-0028); this only lists them.
 *
 * ```html
 * <pio-attribute-rolls [statistics]="checks()" />
 * ```
 */
@Component({
  selector: 'pio-attribute-rolls',
  imports: [Skeleton, Stack, StatisticRoll, Text, TranslocoPipe],
  templateUrl: './attribute-rolls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeRolls {
  /** Each attribute's check as the engine derived it, or undefined while the statistics load. */
  public readonly statistics = input<ReadonlyMap<Attribute, StatisticValue> | undefined>();
  /** Which attributes to list, in this order; all six by default. */
  public readonly attributes = input<readonly Attribute[]>(Object.values(Attribute));
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown lines' origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Check = StatisticKind.Check;
  protected readonly rows = computed((): readonly AttributeRow[] => {
    const statistics = this.statistics();
    return this.attributes().map((attribute) => ({
      attribute,
      name: ATTRIBUTE_MESSAGES[attribute],
      shortName: ATTRIBUTE_SHORT_MESSAGES[attribute],
      statistic: statistics?.get(attribute),
    }));
  });
}

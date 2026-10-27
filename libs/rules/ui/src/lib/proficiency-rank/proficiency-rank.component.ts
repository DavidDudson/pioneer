import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glyph, Text } from '@pioneer/frontier';
import type { Proficiency } from '@pioneer/rules/sdk';

import { PROFICIENCY_LETTERS, PROFICIENCY_NAMES } from './proficiency-rank-messages';

/**
 * A proficiency rank as its letter (U, T, E, M, L), with the rank's name read out in its place, so assistive tech says
 * "Trained" where the sheet shows "T".
 *
 * ```html
 * <pio-proficiency-rank [rank]="rank" />
 * ```
 */
@Component({
  selector: 'pio-proficiency-rank',
  imports: [Glyph, Text, TranslocoPipe],
  templateUrl: './proficiency-rank.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProficiencyRankView {
  /** Undefined for a statistic with no rank: nothing is shown. */
  public readonly rank = input<Proficiency | undefined>();

  protected readonly shown = computed(() => {
    const rank = this.rank();
    return rank === undefined ? undefined : { letter: PROFICIENCY_LETTERS[rank], name: PROFICIENCY_NAMES[rank] };
  });
}

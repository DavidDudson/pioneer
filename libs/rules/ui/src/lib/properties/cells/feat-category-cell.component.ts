import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BadgeTone, Tag } from '@pioneer/frontier';
import type { FeatCategory } from '@pioneer/rules/sdk';

import { FEAT_CATEGORY_MESSAGES } from '../../feat-picker/feat-picker-messages';

/**
 * A feat's category as a neutral tag.
 *
 * ```html
 * <pio-feat-category-cell [value]="feat.category" />
 * ```
 */
@Component({
  selector: 'pio-feat-category-cell',
  imports: [Tag, TranslocoPipe],
  templateUrl: './feat-category-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatCategoryCell {
  public readonly value = input.required<FeatCategory>();

  protected readonly tone = BadgeTone.Neutral;
  protected readonly message = computed(() => FEAT_CATEGORY_MESSAGES[this.value()]);
}

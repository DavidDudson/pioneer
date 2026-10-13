import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glyph } from '@pioneer/frontier';

import { ACTION_KIND_MESSAGES } from '../picker-cell-messages';
import type { ActionKind } from '../picker-cell-messages';

/**
 * What an action costs, as its glyph (◆, ◆◆, ◆◆◆, ◇ free, ⤾ reaction), read out as words. A cost that varies or a
 * passive ability has its own glyph.
 *
 * ```html
 * <pio-action-cost-cell [cost]="feat.actions" />
 * ```
 */
@Component({
  selector: 'pio-action-cost-cell',
  imports: [Glyph, TranslocoPipe],
  templateUrl: './action-cost-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionCostCell {
  public readonly cost = input.required<ActionKind>();

  protected readonly messages = computed(() => ACTION_KIND_MESSAGES[this.cost()]);
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';
import type { ActionCostNode } from '@pioneer/rules/sdk';

import { ACTION_COST_MESSAGES } from '../rich-text-messages';
import type { ActionCostMessages } from '../rich-text-messages';

/** An action glyph, spelled out ("Two actions") for screen readers and on hover. */
@Component({
  selector: 'pio-rich-action-cost',
  imports: [Text, TranslocoPipe],
  templateUrl: './rich-action-cost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichActionCost {
  public readonly node = input.required<ActionCostNode>();

  protected readonly messages = computed((): ActionCostMessages => ACTION_COST_MESSAGES[this.node().cost]);
}

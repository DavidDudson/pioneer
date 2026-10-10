import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glyph, LineBreak } from '@pioneer/frontier';
import type { ActionCostNode, LineBreakNode } from '@pioneer/rules/sdk';

import { ACTION_COST_MESSAGES } from '../rich-text-messages';

/** An inline node with no words of its own: a line break, or an action glyph read out as its name. */
@Component({
  selector: 'pio-rich-mark',
  imports: [Glyph, LineBreak, TranslocoPipe],
  templateUrl: './rich-mark.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichMark {
  public readonly node = input.required<LineBreakNode | ActionCostNode>();

  protected readonly actionCosts = ACTION_COST_MESSAGES;
}

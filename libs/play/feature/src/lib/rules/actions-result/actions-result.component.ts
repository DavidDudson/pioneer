import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, Skeleton, Text } from '@pioneer/frontier';

import { ActionsStatus } from '../actions-check';
import type { ActionsCheck } from '../actions-check';
import { ActionsRow } from '../actions-row/actions-row.component';
import { RulesResult } from '../rules-result/rules-result.component';

/**
 * The actions a character has and whether each can be used (`ActionsRow`). Problems with the actions or the roll
 * options show instead.
 */
@Component({
  selector: 'pio-actions-result',
  imports: [ActionsRow, List, ListItem, RulesResult, Skeleton, Text, TranslocoPipe],
  templateUrl: './actions-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsResult {
  protected readonly ActionsStatus = ActionsStatus;
  public readonly check = input.required<ActionsCheck>();
}

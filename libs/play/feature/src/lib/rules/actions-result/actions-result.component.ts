import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';

import {
  ACTION_COST_KEYS,
  ACTION_MODE_KEYS,
  ACTION_STATUS_KEYS,
  ACTION_STATUS_TONES,
  ActionsStatus,
} from '../actions-check';
import type { ActionsCheck } from '../actions-check';
import { RulesResult } from '../rules-result/rules-result.component';

/**
 * The actions a character has and whether each can be used: its status, cost, the modes it is used in, the total of
 * its roll and why it cannot be used. Problems with the actions or the roll options show instead.
 */
@Component({
  selector: 'pio-actions-result',
  imports: [Badge, List, ListItem, RulesResult, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './actions-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsResult {
  protected readonly ActionsStatus = ActionsStatus;
  protected readonly ACTION_COST_KEYS = ACTION_COST_KEYS;
  protected readonly ACTION_MODE_KEYS = ACTION_MODE_KEYS;
  protected readonly ACTION_STATUS_KEYS = ACTION_STATUS_KEYS;
  protected readonly ACTION_STATUS_TONES = ACTION_STATUS_TONES;
  public readonly check = input.required<ActionsCheck>();
}

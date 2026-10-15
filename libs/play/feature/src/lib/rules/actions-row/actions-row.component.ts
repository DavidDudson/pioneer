import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { ACTION_COST_KEYS, ACTION_MODE_KEYS, ACTION_STATUS_KEYS, ACTION_STATUS_TONES } from '../actions-check';
import type { ActionRow } from '../actions-check';

/** One action: its status, cost, modes and roll total, and why it cannot be used. */
@Component({
  selector: 'pio-actions-row',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './actions-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsRow {
  protected readonly ACTION_COST_KEYS = ACTION_COST_KEYS;
  protected readonly ACTION_MODE_KEYS = ACTION_MODE_KEYS;
  protected readonly ACTION_STATUS_KEYS = ACTION_STATUS_KEYS;
  protected readonly ACTION_STATUS_TONES = ACTION_STATUS_TONES;
  public readonly row = input.required<ActionRow>();
}

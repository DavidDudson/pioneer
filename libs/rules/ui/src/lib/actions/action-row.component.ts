import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';
import type { BadgeTone } from '@pioneer/frontier';
import { ActionStatus } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';

import { ChipList } from '../picker-cells/chip-list/chip-list.component';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';
import type { ActionLine } from './action-line';
import { ACTION_STATUS_MESSAGES } from './actions-messages';
import { UseButtons } from './use-buttons.component';

/** One action as shown: the line with its cost, source and reasons already worded. */
export interface ShownAction {
  readonly line: ActionLine;
  /** "1 action, Basic action" or "Reaction, Granted by Shield Block": its cost and where it comes from. */
  readonly detail: string;
  /** Why it is not plainly available, worded. */
  readonly reasons: readonly string[];
}

const STATUS_TONES: Readonly<Record<ActionStatus, BadgeTone>> = {
  [ActionStatus.Available]: 'success',
  [ActionStatus.Conditional]: 'warning',
  [ActionStatus.Unavailable]: 'danger',
};

/**
 * One action of the list (`pio-actions`): its name, cost and source, its traits, why it cannot be used plainly, and a
 * button to roll it when it rolls. The status shows only when asked for, as the Now view lists nothing unusable.
 */
@Component({
  selector: 'pio-action-row',
  imports: [Badge, ChipList, Stack, StatisticRoll, Text, TranslocoPipe, UseButtons],
  templateUrl: './action-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionRow {
  public readonly action = input.required<ShownAction>();
  /** Whether to show the status, which the All view needs and the Now view does not. */
  public readonly showStatus = input(false);

  protected readonly Check = StatisticKind.Check;
  protected readonly statusKey = computed(() => ACTION_STATUS_MESSAGES[this.action().line.status]);
  protected readonly statusTone = computed(() => STATUS_TONES[this.action().line.status]);
  protected readonly chips = computed((): readonly Chip[] =>
    this.action().line.traits.map((label): Chip => ({ label })),
  );
}

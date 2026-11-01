import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActionIcon, Badge, Stack } from '@pioneer/frontier';
import type { ActionIconCost, BadgeTone } from '@pioneer/frontier';
import { ActionStatus } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';

import { EntryNameCell } from '../picker-cells/entry-name-cell/entry-name-cell.component';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';
import type { ActionLine } from './action-line';
import { ACTION_STATUS_MESSAGES } from './actions-messages';
import { UseButtons } from './use-buttons.component';

/** An action cost to draw as icons: what it costs, the cost a range runs to, and the name a screen reader says. */
export interface ActionCostIcon {
  readonly cost: ActionIconCost;
  readonly upTo?: ActionIconCost | undefined;
  readonly label: string;
}

/** One action as shown: the line with its cost, source and reasons already worded. */
export interface ShownAction {
  readonly line: ActionLine;
  /** "1 action, Basic action" or "Reaction, Granted by Shield Block": its cost and where it comes from. */
  readonly detail: string;
  /** The cost drawn as action icons, with its words; absent for a cost the icons cannot draw, which `detail` words. */
  readonly costIcon?: ActionCostIcon | undefined;
  /** Why it is not plainly available, worded. */
  readonly reasons: readonly string[];
  /** "+2 circumstance when your shield is raised (Steel Shield)": the roll's lines that apply only in some situations. */
  readonly conditions: readonly string[];
}

const STATUS_TONES: Readonly<Record<ActionStatus, BadgeTone>> = {
  [ActionStatus.Available]: 'success',
  [ActionStatus.Conditional]: 'warning',
  [ActionStatus.Unavailable]: 'danger',
};

/**
 * One action of the list (`pio-actions`) as a compact row: its cost icon and name on the left, its roll and use buttons
 * on the right. Source, traits and reasons stay on the `ShownAction`, for the content panel. The status shows only when
 * asked for, as the Now view lists nothing unusable.
 */
@Component({
  selector: 'pio-action-row',
  imports: [ActionIcon, Badge, EntryNameCell, Stack, StatisticRoll, TranslocoPipe, UseButtons],
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
}

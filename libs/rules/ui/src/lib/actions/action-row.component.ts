import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Badge, Stack, Text } from '@pioneer/frontier';
import type { BadgeTone } from '@pioneer/frontier';
import { ActionStatus } from '@pioneer/rules/engine';
import { ACTION_COUNT, StatisticKind } from '@pioneer/rules/sdk';

import { ChipList } from '../picker-cells/chip-list/chip-list.component';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';
import type { ActionLine } from './action-line';
import { ActionUser } from './action-user';
import { ACTION_STATUS_MESSAGES, ActionsMessage } from './actions-messages';

/** One action as shown: the line with its cost, source and reasons already worded. */
export interface ShownAction {
  readonly line: ActionLine;
  /** "1 action, Basic action" or "Reaction, Granted by Shield Block": its cost and where it comes from. */
  readonly detail: string;
  /** Why it is not plainly available, worded. */
  readonly reasons: readonly string[];
}

const ONE_ACTION = 1;

/** The message key that words the button for `count` actions. */
function useKeyFor(count: number): string {
  return count === ONE_ACTION ? ActionsMessage.UseForOne : ActionsMessage.UseForMany;
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
  imports: [AsyncButton, Badge, ChipList, Stack, StatisticRoll, Text, TranslocoPipe],
  templateUrl: './action-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionRow {
  public readonly action = input.required<ShownAction>();
  /** Whether to show the status, which the All view needs and the Now view does not. */
  public readonly showStatus = input(false);

  readonly #user = inject(ActionUser, { optional: true });

  protected readonly Message = ActionsMessage;
  protected readonly Check = StatisticKind.Check;
  protected readonly statusKey = computed(() => ACTION_STATUS_MESSAGES[this.action().line.status]);
  protected readonly statusTone = computed(() => STATUS_TONES[this.action().line.status]);
  protected readonly chips = computed((): readonly Chip[] =>
    this.action().line.traits.map((label): Chip => ({ label })),
  );

  /** Whether there is something to use it with: a page that spends, and an action with a cost that is not out of reach. */
  protected readonly usable = computed((): boolean => {
    const { cost, status } = this.action().line;
    return this.#user !== null && cost !== undefined && status !== ActionStatus.Unavailable;
  });

  /** For a variable cost, the counts it can be used for, fewest first; empty for a fixed cost. */
  protected readonly counts = computed((): readonly number[] => {
    const { cost, upTo } = this.action().line;
    const from = cost === undefined ? undefined : ACTION_COUNT[cost];
    return from === undefined || upTo === undefined
      ? []
      : Array.from({ length: upTo - from + 1 }, (_slot, index) => from + index);
  });

  /** The action used, for `actions` of them when its cost varies; the page spends from the turn. */
  protected readonly useFor = (actions: number | undefined) => async (): Promise<void> => {
    await this.#user?.use({ line: this.action().line, actions });
  };

  protected readonly useKey = useKeyFor;
}

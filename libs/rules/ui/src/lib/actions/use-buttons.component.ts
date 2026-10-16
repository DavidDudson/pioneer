import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton } from '@pioneer/frontier';
import { ActionStatus } from '@pioneer/rules/engine';
import { ACTION_COUNT } from '@pioneer/rules/sdk';

import { ActionUser } from './action-user';
import type { UsableLine } from './action-user';
import { ActionsMessage } from './actions-messages';

const ONE_ACTION = 1;

/** The message key that words the button for `count` actions. */
function useKeyFor(count: number): string {
  return count === ONE_ACTION ? ActionsMessage.UseForOne : ActionsMessage.UseForMany;
}

/**
 * The button that uses something with a cost, a Strike, spell, item activation or action: one Use button, or for a
 * variable cost one per count of actions the turn can pay. Nothing shows without a page that spends (`ActionUser`),
 * for something without a cost, out of reach, or too dear for the actions left.
 */
@Component({
  selector: 'pio-use-buttons',
  imports: [AsyncButton, TranslocoPipe],
  templateUrl: './use-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UseButtons {
  /** What to use; nothing shows without one. */
  public readonly line = input.required<UsableLine | undefined>();

  readonly #user = inject(ActionUser, { optional: true });

  protected readonly Message = ActionsMessage;

  /** Whether there is something to use it with: a page that spends, a cost or a payment, and nothing out of reach. */
  protected readonly usable = computed((): boolean => {
    const { cost, status, affordable, payment } = this.line() ?? {};
    const spends = cost !== undefined || payment !== undefined;
    return this.#user !== null && spends && status !== ActionStatus.Unavailable && affordable !== false;
  });

  /** For a variable cost, the counts it can be used for, fewest first; empty for a fixed cost. */
  protected readonly counts = computed((): readonly number[] => {
    const { cost, upTo, affordableUpTo } = this.line() ?? {};
    const from = cost === undefined ? undefined : ACTION_COUNT[cost];
    if (from === undefined || upTo === undefined) {
      return [];
    }
    const most = Math.min(upTo, affordableUpTo ?? upTo);
    return Array.from({ length: Math.max(most - from + 1, 0) }, (_slot, index) => from + index);
  });

  /** The thing used, for `actions` of them when its cost varies; the page spends from the turn. */
  protected readonly useFor = (actions: number | undefined) => async (): Promise<void> => {
    const line = this.line();
    if (line !== undefined) {
      await this.#user?.use({ line, actions });
    }
  };

  protected readonly useKey = useKeyFor;
}

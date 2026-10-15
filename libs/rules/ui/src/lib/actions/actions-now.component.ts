import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, Heading, Stack } from '@pioneer/frontier';
import type { ActionMode } from '@pioneer/rules/sdk';

import type { ActionLine } from './action-line';
import { ActionList } from './action-list.component';
import type { ShownAction } from './action-row.component';
import { ActionWords } from './action-words';
import { nowGroups } from './actions-list';
import { ActionsMessage } from './actions-messages';

/** A group of actions under its cost, as shown. */
interface ShownGroup {
  readonly heading: string;
  readonly rows: readonly ShownAction[];
}

/**
 * The Now view (`pio-actions`): what a character can do at this moment in `mode`, grouped by cost, with the actions the
 * situation calls for first.
 */
@Component({
  selector: 'pio-actions-now',
  imports: [ActionList, EmptyState, Heading, Stack, TranslocoPipe],
  templateUrl: './actions-now.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsNow {
  /** Undefined while loading. */
  public readonly lines = input.required<readonly ActionLine[] | undefined>();
  public readonly mode = input.required<ActionMode>();

  protected readonly Message = ActionsMessage;
  readonly #words = inject(ActionWords);

  protected readonly groups = computed((): readonly ShownGroup[] | undefined => {
    this.#words.changed();
    const lines = this.lines();
    return lines === undefined
      ? undefined
      : nowGroups(lines, this.mode()).map(({ cost, lines: grouped }): ShownGroup => ({
          heading: this.#words.cost(cost),
          rows: grouped.map((line) => this.#words.shown(line)),
        }));
  });
}

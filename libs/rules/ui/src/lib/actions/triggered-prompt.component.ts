import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, Heading, Stack } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import type { ActionLine } from './action-line';
import { ActionList } from './action-list.component';
import type { ShownAction } from './action-row.component';
import { ActionWords } from './action-words';
import { ActionsMessage } from './actions-messages';

/**
 * The abilities a turn event triggered that cost something or need a choice, listed together: each is a row that is
 * used as any action is, and passing lets the lot go for this event.
 */
@Component({
  selector: 'pio-triggered-prompt',
  imports: [ActionList, Button, Heading, Stack, TranslocoPipe],
  templateUrl: './triggered-prompt.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriggeredPrompt {
  /** The offered abilities, as the actions list has them. */
  public readonly lines = input.required<readonly ActionLine[]>();
  /** What names the entries a conditional line comes from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** The player let the abilities pass. */
  public readonly passed = output();

  protected readonly Message = ActionsMessage;
  protected readonly variant = ButtonVariant;
  readonly #words = inject(ActionWords);

  protected readonly rows = computed((): readonly ShownAction[] => {
    this.#words.changed();
    const names = { entries: this.entryNames(), items: new Map() };

    return this.lines().map((line) => this.#words.shown(line, names));
  });
}

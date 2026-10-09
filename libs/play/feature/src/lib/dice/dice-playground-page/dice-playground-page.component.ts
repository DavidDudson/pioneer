import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  Button,
  Field,
  FieldError,
  FieldHint,
  Heading,
  Label,
  Page,
  Stack,
  Surface,
  Text,
  TextInput,
} from '@pioneer/frontier';
import { DiceExpressionText, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { ParseOutcome } from '@pioneer/rules/dice';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { RANDOM_SOURCE } from '../random-source';
import { RollCard } from '../roll-card/roll-card.component';
import { rollView } from '../roll-view';
import type { RollView } from '../roll-view';

/** Newest rolls shown; older ones fall off. */
const HISTORY_LIMIT = 10;
const STARTING_EXPRESSION = '1d20+7';

/** Type an expression, roll it, and see every die behind the total. */
@Component({
  selector: 'pio-dice-playground-page',
  imports: [
    Button,
    Field,
    FieldError,
    FieldHint,
    Heading,
    Label,
    Page,
    RollCard,
    Stack,
    Surface,
    Text,
    TextInput,
    TranslocoPipe,
  ],
  templateUrl: './dice-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DicePlaygroundPage {
  readonly #random = inject(RANDOM_SOURCE);
  #rolled = 0;

  protected readonly text = signal(STARTING_EXPRESSION);
  readonly #outcome = computed((): ParseOutcome => parseDiceExpression(DiceExpressionText.parse(this.text())));
  protected readonly error = computed((): MessageDescriptor | undefined => {
    const outcome = this.#outcome();
    return outcome.ok ? undefined : outcome.error;
  });
  protected readonly rolls = signal<readonly RollView[]>([]);

  protected roll(): void {
    const outcome = this.#outcome();
    if (!outcome.ok) {
      return;
    }
    this.#rolled += 1;
    const view = rollView(this.#rolled, rollDice(outcome.expression, this.#random));
    this.rolls.update((rolls) => [view, ...rolls].slice(0, HISTORY_LIMIT));
  }
}

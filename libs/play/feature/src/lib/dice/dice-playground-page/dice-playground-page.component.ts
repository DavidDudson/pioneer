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
import { DiceExpressionText, parseDiceExpression, rollWithFortune } from '@pioneer/rules/dice';
import type { FortuneSources, ParseOutcome } from '@pioneer/rules/dice';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { RANDOM_SOURCE } from '../random-source';
import { RollCard } from '../roll-card/roll-card.component';
import { rollView } from '../roll-view';
import type { RollView } from '../roll-view';

/** Newest rolls shown; older ones fall off. */
const HISTORY_LIMIT = 10;
const STARTING_EXPRESSION = '1d20+7';

/** What the playground's toggles stand in for; real effects will name the feat or spell granting them. */
const PLAYGROUND_FORTUNE = message('play.dice.playgroundFortune');
const PLAYGROUND_MISFORTUNE = message('play.dice.playgroundMisfortune');

/** Type an expression, roll it with or without fortune and misfortune, and see every die behind the total. */
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
  protected readonly fortune = signal(false);
  protected readonly misfortune = signal(false);
  readonly #sources = computed((): FortuneSources => ({
    fortune: this.fortune() ? [PLAYGROUND_FORTUNE] : [],
    misfortune: this.misfortune() ? [PLAYGROUND_MISFORTUNE] : [],
  }));
  protected readonly rolls = signal<readonly RollView[]>([]);

  protected toggleFortune(): void {
    this.fortune.update((on) => !on);
  }

  protected toggleMisfortune(): void {
    this.misfortune.update((on) => !on);
  }

  protected roll(): void {
    const outcome = this.#outcome();
    if (!outcome.ok) {
      return;
    }
    this.#rolled += 1;
    const roll = rollWithFortune(outcome.expression, this.#sources(), this.#random);
    const view = rollView(this.#rolled, outcome.expression, roll);
    this.rolls.update((rolls) => [view, ...rolls].slice(0, HISTORY_LIMIT));
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FontWeight, Heading, LocaleFormat, Stack, Surface, Text, Tone } from '@pioneer/frontier';
import type { DiceExpressionText } from '@pioneer/rules/dice';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { RollTerm } from '../roll-term/roll-term.component';
import type { TermDisplay } from '../roll-term/roll-term.component';
import type { AttemptView, RollView } from '../roll-view';

interface AttemptDisplay {
  /** "Roll 2: 21, kept"; unset when there was only one roll. */
  readonly heading: MessageDescriptor | undefined;
  readonly tone: Tone;
  readonly weight: FontWeight | undefined;
  readonly terms: readonly TermDisplay[];
}

interface RollDisplay {
  readonly notation: DiceExpressionText;
  readonly total: string;
  readonly explanation: MessageDescriptor | undefined;
  readonly attempts: readonly AttemptDisplay[];
}

/**
 * One finished roll: its expression and total, then each roll made (two with fortune or misfortune)
 * with the dice behind it.
 */
@Component({
  selector: 'pio-roll-card',
  imports: [Heading, RollTerm, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './roll-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollCard {
  readonly #format = inject(LocaleFormat);
  public readonly roll = input.required<RollView>();

  /** Numbers in the viewer's locale; re-formats on a locale switch. */
  protected readonly display = computed((): RollDisplay => {
    const roll = this.roll();
    const several = roll.attempts.length > 1;
    return {
      notation: roll.notation,
      total: this.#format.number(roll.total),
      explanation: roll.explanation,
      attempts: roll.attempts.map((attempt, index) => this.#attempt(attempt, several ? index : undefined)),
    };
  });

  /** `index` is set only when there are several rolls to tell apart. */
  #attempt(attempt: AttemptView, index: number | undefined): AttemptDisplay {
    const params = { number: this.#format.number((index ?? 0) + 1), total: this.#format.number(attempt.total) };
    const key = attempt.kept ? 'play.dice.keptRoll' : 'play.dice.discardedRoll';
    return {
      heading: index === undefined ? undefined : message(key, params),
      tone: attempt.kept ? Tone.Default : Tone.Subtle,
      weight: attempt.kept ? FontWeight.Semibold : undefined,
      terms: attempt.terms.map((term) => ({
        notation: term.notation,
        damageKeys: term.damageKeys,
        dice: term.dice.map((die) => ({ face: this.#format.number(die.face), kept: die.kept })),
        value: this.#format.number(term.value),
      })),
    };
  }
}

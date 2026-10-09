import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, LocaleFormat, Stack, Surface, Text } from '@pioneer/frontier';
import type { DiceExpressionText } from '@pioneer/rules/dice';

import type { RollView } from '../roll-view';

interface DieDisplay {
  readonly face: string;
  readonly kept: boolean;
}

interface TermDisplay {
  readonly notation: DiceExpressionText;
  readonly damageKeys: readonly string[];
  readonly dice: readonly DieDisplay[];
  readonly value: string;
}

interface RollDisplay {
  readonly notation: DiceExpressionText;
  readonly total: string;
  readonly terms: readonly TermDisplay[];
}

/** One finished roll: its expression and total, then each term with the dice behind it. */
@Component({
  selector: 'pio-roll-card',
  imports: [Heading, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './roll-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollCard {
  readonly #format = inject(LocaleFormat);
  public readonly roll = input.required<RollView>();

  /** Numbers in the viewer's locale; re-formats on a locale switch. */
  protected readonly display = computed((): RollDisplay => {
    const roll = this.roll();
    return {
      notation: roll.notation,
      total: this.#format.number(roll.total),
      terms: roll.terms.map((term) => ({
        notation: term.notation,
        damageKeys: term.damageKeys,
        dice: term.dice.map((die) => ({ face: this.#format.number(die.face), kept: die.kept })),
        value: this.#format.number(term.value),
      })),
    };
  });
}

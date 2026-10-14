import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FontWeight, Heading, LocaleFormat, Stack, Surface, Text, Tone } from '@pioneer/frontier';
import type { DiceExpressionText } from '@pioneer/rules/dice';
import type { Dc } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { RollAttempt } from '../roll-attempt/roll-attempt.component';
import type { AttemptDisplay } from '../roll-attempt/roll-attempt.component';
import { RollDamage } from '../roll-damage/roll-damage.component';
import { RollDc } from '../roll-dc/roll-dc.component';
import { RollDegree } from '../roll-degree/roll-degree.component';
import { RollReasons } from '../roll-reasons/roll-reasons.component';
import type { AttemptView, DamageView, DegreeView, RollView } from '../roll-view';

interface RollDisplay {
  readonly notation: DiceExpressionText;
  readonly total: string;
  readonly explanation: MessageDescriptor | undefined;
  readonly attempts: readonly AttemptDisplay[];
  readonly degree: DegreeView | undefined;
  readonly damage: DamageView | undefined;
  readonly reasons: readonly string[];
}

/**
 * One finished roll: its expression and total, then each roll made (two with fortune or misfortune)
 * with the dice behind it, its degree of success when rolled against a DC, and the damage a target takes.
 *
 * With `dcEditable` the card has a DC box; typing a DC emits it, and the caller hands back the roll with its degree
 * worked out (the card holds no dice rules). Emptying the box emits undefined, and the degree goes.
 *
 * ```html
 * <pio-roll-card [roll]="roll()" [dc]="dc()" dcEditable (dcChange)="dc.set($event)" />
 * ```
 */
@Component({
  selector: 'pio-roll-card',
  imports: [Heading, RollAttempt, RollDamage, RollDc, RollDegree, RollReasons, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './roll-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollCard {
  readonly #format = inject(LocaleFormat);
  public readonly roll = input.required<RollView>();
  /** The DC the roll is compared with; unset when it is not rolled against one. */
  public readonly dc = input<Dc | undefined>(undefined);
  /** Whether the card offers a DC box. */
  public readonly dcEditable = input(false, { transform: booleanAttribute });
  /** The DC typed in the box, or undefined once it is emptied. */
  public readonly dcChange = output<Dc | undefined>();

  /** Numbers in the viewer's locale; re-formats on a locale switch. */
  protected readonly display = computed((): RollDisplay => {
    const roll = this.roll();
    const several = roll.attempts.length > 1;
    return {
      notation: roll.notation,
      total: this.#format.number(roll.total),
      explanation: roll.explanation,
      attempts: roll.attempts.map((attempt, index) => this.#attempt(attempt, several ? index : undefined)),
      degree: roll.degree,
      damage: roll.damage,
      reasons: roll.reasons,
    };
  });

  /** `index` is set only when there are several rolls to tell apart. */
  #attempt(attempt: AttemptView, index: number | undefined): AttemptDisplay {
    const params = { number: this.#format.number((index ?? 0) + 1), total: this.#format.number(attempt.total) };
    const key = attempt.kept ? 'roll.card.keptRoll' : 'roll.card.discardedRoll';
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

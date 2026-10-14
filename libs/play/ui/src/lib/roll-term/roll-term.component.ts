import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';
import type { DiceExpressionText } from '@pioneer/rules/dice';

interface DieDisplay {
  readonly face: string;
  readonly kept: boolean;
}

/** A term ready to show: numbers already formatted in the viewer's locale. */
export interface TermDisplay {
  readonly notation: DiceExpressionText;
  readonly damageKeys: readonly string[];
  readonly dice: readonly DieDisplay[];
  readonly value: string;
}

/** One term of a roll on a line: notation, damage labels, each die (dropped ones marked) and its value. */
@Component({
  selector: 'pio-roll-term',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './roll-term.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollTerm {
  public readonly term = input.required<TermDisplay>();
}

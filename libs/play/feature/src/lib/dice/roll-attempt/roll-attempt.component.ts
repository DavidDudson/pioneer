import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';
import type { FontWeight, Tone } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { RollTerm } from '../roll-term/roll-term.component';
import type { TermDisplay } from '../roll-term/roll-term.component';

/** One roll of the expression, ready to show: numbers already formatted in the viewer's locale. */
export interface AttemptDisplay {
  /** "Roll 2: 21, kept"; unset when there was only one roll. */
  readonly heading: MessageDescriptor | undefined;
  readonly tone: Tone;
  readonly weight: FontWeight | undefined;
  readonly terms: readonly TermDisplay[];
}

/** One roll of the expression: which it was and whether kept, when there were two, then each term. */
@Component({
  selector: 'pio-roll-attempt',
  imports: [RollTerm, Stack, Text, TranslocoPipe],
  templateUrl: './roll-attempt.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollAttempt {
  public readonly attempt = input.required<AttemptDisplay>();
}

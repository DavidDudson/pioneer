import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';
import { RichTextView } from '@pioneer/rules/ui';

import { OutcomeKind } from '../roll-view';
import type { OutcomeView } from '../roll-view';

/**
 * What the rolled degree does: a basic save's fixed result ("Takes half damage"), or the paragraph the check's text
 * gives for that degree, with its own links and rolls.
 *
 * ```html
 * <pio-roll-outcome [outcome]="outcome" />
 * ```
 */
@Component({
  selector: 'pio-roll-outcome',
  imports: [RichTextView, Text, TranslocoPipe],
  templateUrl: './roll-outcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollOutcome {
  /** Unset when the roll has no outcome to show; the component then renders nothing. */
  public readonly outcome = input.required<OutcomeView | undefined>();

  protected readonly kinds = OutcomeKind;
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Stack, Text } from '@pioneer/frontier';

import type { ChoiceReplacement } from '../choice-line';
import { ChoicesMessage } from '../choices-messages';

/** Why a pick is replaced, and a button per newer entry that swaps the pick for it. */
@Component({
  selector: 'pio-replacement-offer',
  imports: [Button, Stack, Text, TranslocoPipe],
  templateUrl: './replacement-offer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplacementOffer {
  /** Whether the offer is showing. */
  public readonly open = input(false);
  /** The name of the replaced pick. */
  public readonly name = input<string | undefined>();
  public readonly replacements = input.required<readonly ChoiceReplacement[]>();
  /** A replacement was pressed. */
  public readonly replace = output<ChoiceReplacement>();

  protected readonly Message = ChoicesMessage;
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, Stack, Text } from '@pioneer/frontier';

import type { WandLine } from './wand-spells-line';
import { WAND_CHECK_MESSAGES, WandSpellsMessage } from './wand-spells-messages';

/**
 * What the player can do with one wand: cast it, overcharge it, mark it repaired, or confirm or decline the flat check
 * already rolled for an overcharge. Presentational: the section above it makes the casts and rolls.
 */
@Component({
  selector: 'pio-wand-controls',
  imports: [Button, Stack, Text, TranslocoPipe],
  templateUrl: './wand-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WandControls {
  public readonly line = input.required<WandLine>();
  public readonly busy = input(false);

  public readonly cast = output<string>();
  public readonly overcharge = output<string>();
  public readonly confirm = output<string>();
  public readonly decline = output<string>();
  public readonly repair = output<string>();

  protected readonly Message = WandSpellsMessage;
  protected readonly checks = WAND_CHECK_MESSAGES;
  protected readonly primary = ButtonVariant.Primary;
  protected readonly danger = ButtonVariant.Danger;
}

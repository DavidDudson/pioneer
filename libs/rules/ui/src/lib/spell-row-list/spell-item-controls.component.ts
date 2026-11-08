import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, Stack } from '@pioneer/frontier';

import { WandSpellsMessage } from '../wand-spells/wand-spells-messages';
import type { SpellItemEvent, SpellItemLine } from './spell-item';
import { StaffRowControls } from './staff-row-controls.component';
import { WandRowControls } from './wand-row-controls.component';

/**
 * What the player can do with the item a spell is cast from, under its row: cast a wand, overcharge it, or mark it
 * repaired; pick how a staff's charge is paid; cast a scroll. Presentational: the page makes the casts and rolls.
 */
@Component({
  selector: 'pio-spell-item-controls',
  imports: [Button, Stack, StaffRowControls, TranslocoPipe, WandRowControls],
  templateUrl: './spell-item-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellItemControls {
  public readonly item = input.required<SpellItemLine>();
  public readonly busy = input(false);

  public readonly act = output<SpellItemEvent>();

  protected readonly Message = WandSpellsMessage;
  protected readonly primary = ButtonVariant.Primary;
}

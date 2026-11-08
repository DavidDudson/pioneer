import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';

import { WandControls } from '../wand-spells/wand-controls.component';
import type { WandLine } from '../wand-spells/wand-spells-line';
import { WAND_BLOCK_MESSAGES, WandSpellsMessage } from '../wand-spells/wand-spells-messages';
import type { SpellItemEvent } from './spell-item';

/** What the player can do with the wand a spell row is cast from, and why it can't be cast when it can't. */
@Component({
  selector: 'pio-wand-row-controls',
  imports: [Text, TranslocoPipe, WandControls],
  templateUrl: './wand-row-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WandRowControls {
  public readonly wand = input.required<WandLine>();
  public readonly busy = input(false);

  public readonly act = output<SpellItemEvent>();

  protected readonly Message = WandSpellsMessage;
  protected readonly blocks = WAND_BLOCK_MESSAGES;
}

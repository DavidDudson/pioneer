import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, Stack, Text } from '@pioneer/frontier';

import { EntryHover } from '../entry-preview/entry-hover.component';
import { WandControls } from './wand-controls.component';
import type { WandLine } from './wand-spells-line';
import { WAND_BLOCK_MESSAGES, WandSpellsMessage } from './wand-spells-messages';

/**
 * The wands a character holds, each as its own section of the spell list (play-and-campaigns.md, "Staves and charged
 * items"): the wand's name, its cast for the day, and the spell it holds. A wand casts once a day; after that it can
 * be overcharged, and the flat check and what it would come to are shown here before the player confirms. A wand the
 * holder can't cast is shown with the reason, not hidden, and a broken one offers to be marked repaired.
 *
 * Presentational (ADR-0028): the caller works out the lines and makes the casts and rolls.
 *
 * ```html
 * <pio-wand-spells [wands]="wands()" (cast)="cast($event)" />
 * ```
 */
@Component({
  selector: 'pio-wand-spells',
  imports: [Badge, EntryHover, Heading, Stack, Text, TranslocoPipe, WandControls],
  templateUrl: './wand-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WandSpellsView {
  /** The held wands; none renders nothing. */
  public readonly wands = input<readonly WandLine[]>([]);
  /** Whether an edit is in flight, so no second one is started. */
  public readonly busy = input(false);
  /** Why the last edit failed, shown until the next one; undefined when none did. */
  public readonly error = input<string | undefined>(undefined);

  /** The key of the wand to cast the day's spell of. */
  public readonly cast = output<string>();
  /** The key of the wand to roll the overcharge's flat check for. */
  public readonly overcharge = output<string>();
  /** The key of the wand whose rolled overcharge the player confirms. */
  public readonly confirm = output<string>();
  /** The key of the wand whose rolled overcharge the player declines. */
  public readonly decline = output<string>();
  /** The key of the broken wand to mark repaired. */
  public readonly repair = output<string>();

  protected readonly Message = WandSpellsMessage;
  protected readonly blocks = WAND_BLOCK_MESSAGES;
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';

import { SpellListMessage } from '../spell-list/spell-list-messages';
import { SpellRow } from '../spell-row/spell-row.component';
import type { SpellItemEvent } from './spell-item';
import { SpellItemControls } from './spell-item-controls.component';
import type { SpellRowLine } from './spell-row-line';

/**
 * Every spell a character can cast as one list of compact spell rows (`pio-spell-row`), in the order the caller gives
 * them: a spell known from two sources is two rows, each with its own source. A spell cast from a wand, a staff or a
 * scroll is a row too, with the controls of its item under it.
 *
 * Read-only and presentational (ADR-0028): the caller works out the lines, or passes undefined while they load, and
 * makes what the player does with an item.
 *
 * ```html
 * <pio-spell-row-list [lines]="lines()" (itemAction)="act($event)" />
 * ```
 */
@Component({
  selector: 'pio-spell-row-list',
  imports: [EmptyState, List, ListItem, Skeleton, SpellItemControls, SpellRow, Stack, Text, TranslocoPipe],
  templateUrl: './spell-row-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellRowList {
  /** The spells to list, or undefined while they load. */
  public readonly lines = input<readonly SpellRowLine[] | undefined>();
  /** Whether an edit is in flight, so no second one is started. */
  public readonly busy = input(false);
  /** Why the last edit failed, shown until the next one; undefined when none did. */
  public readonly error = input<string | undefined>(undefined);

  /** What the player chose to do with a wand, staff or scroll. */
  public readonly itemAction = output<SpellItemEvent>();

  protected readonly Message = SpellListMessage;
}

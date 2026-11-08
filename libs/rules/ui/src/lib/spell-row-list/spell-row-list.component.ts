import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, List, ListItem, Skeleton, Stack } from '@pioneer/frontier';

import { SpellListMessage } from '../spell-list/spell-list-messages';
import { SpellRow } from '../spell-row/spell-row.component';
import type { SpellRowLine } from './spell-row-line';

/**
 * Every spell a character can cast as one list of compact spell rows (`pio-spell-row`), in the order the caller gives
 * them: a spell known from two sources is two rows, each with its own source.
 *
 * Read-only and presentational (ADR-0028): the caller works out the lines, or passes undefined while they load.
 *
 * ```html
 * <pio-spell-row-list [lines]="lines()" />
 * ```
 */
@Component({
  selector: 'pio-spell-row-list',
  imports: [EmptyState, List, ListItem, Skeleton, SpellRow, Stack, TranslocoPipe],
  templateUrl: './spell-row-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellRowList {
  /** The spells to list, or undefined while they load. */
  public readonly lines = input<readonly SpellRowLine[] | undefined>();

  protected readonly Message = SpellListMessage;
}

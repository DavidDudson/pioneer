import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';

import { FocusSpellRow } from '../focus-spells/focus-spell-row.component';
import { TRADITION_MESSAGES } from '../spellcasting/spellcasting-messages';
import type { InnateLine } from './innate-spells-line';
import { InnateSpellsMessage } from './innate-spells-messages';

/**
 * A character's innate spells (ADR-0067): each innate entry by its tradition, with its spells and the rank each is cast
 * at. An entry with no spells yet says a choice may still be open (Fey Influence's heritage).
 *
 * Read-only and presentational (ADR-0028): the caller works out the line from the character's innate entries, or
 * passes undefined while they load.
 *
 * ```html
 * <pio-innate-spells [innate]="innate()" />
 * ```
 */
@Component({
  selector: 'pio-innate-spells',
  imports: [Badge, EmptyState, FocusSpellRow, Heading, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './innate-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InnateSpellsView {
  /** The character's innate spells, or undefined while they load. */
  public readonly innate = input<InnateLine | undefined>();

  protected readonly Message = InnateSpellsMessage;
  protected readonly traditions = TRADITION_MESSAGES;
}

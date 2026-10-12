import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { TRADITION_MESSAGES } from '../spellcasting/spellcasting-messages';
import type { FocusLine } from './focus-spells-line';
import { FocusSpellsMessage } from './focus-spells-messages';

/**
 * A character's focus spells (ADR-0048): the focus pool, the rank every focus spell is cast at (half the level,
 * rounded up), and each focus entry's spells by its tradition, a focus cantrip marked as such. An entry with no spells
 * yet says a choice may still be open (a cleric's domain).
 *
 * Read-only and presentational (ADR-0028): the caller works out the line from the character's focus entries.
 *
 * ```html
 * <pio-focus-spells [focus]="focus()" />
 * ```
 */
@Component({
  selector: 'pio-focus-spells',
  imports: [Badge, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './focus-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusSpellsView {
  public readonly focus = input.required<FocusLine>();

  protected readonly Message = FocusSpellsMessage;
  protected readonly traditions = TRADITION_MESSAGES;
}

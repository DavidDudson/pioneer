import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';

import { TRADITION_MESSAGES } from '../spellcasting/spellcasting-messages';
import type { FocusEntryLine, FocusLine, FocusSpellLine } from './focus-spells-line';
import { FocusSpellsMessage } from './focus-spells-messages';

/** A spell as the list shows it: its name, and a badge per tag ("Cantrip"), as message keys. */
interface SpellRow extends FocusSpellLine {
  readonly tags: readonly string[];
}

/** An entry as the list shows it: its spells, or an empty state's title when it has none. */
interface EntryRow extends Omit<FocusEntryLine, 'spells'> {
  readonly spells: readonly SpellRow[];
  readonly empty: readonly string[];
}

interface FocusView extends Omit<FocusLine, 'entries'> {
  readonly entries: readonly EntryRow[];
}

function viewOf(focus: FocusLine): FocusView {
  return {
    ...focus,
    entries: focus.entries.map((entry) => ({
      ...entry,
      spells: entry.spells.map((spell) => ({ ...spell, tags: spell.cantrip ? [FocusSpellsMessage.Cantrip] : [] })),
      empty: entry.spells.length === 0 ? [FocusSpellsMessage.None] : [],
    })),
  };
}

/**
 * A character's focus spells (ADR-0050): the focus pool, the rank every focus spell is cast at (half the level,
 * rounded up), and each focus entry's spells by its tradition, a focus cantrip marked as such. An entry with no spells
 * yet says a choice may still be open (a cleric's domain).
 *
 * Read-only and presentational (ADR-0028): the caller works out the line from the character's focus entries, or
 * passes undefined while they load.
 *
 * ```html
 * <pio-focus-spells [focus]="focus()" />
 * ```
 */
@Component({
  selector: 'pio-focus-spells',
  imports: [Badge, EmptyState, Heading, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './focus-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusSpellsView {
  /** The character's focus spells, or undefined while they load. */
  public readonly focus = input<FocusLine | undefined>();

  protected readonly view = computed((): FocusView | undefined => {
    const focus = this.focus();
    return focus === undefined ? undefined : viewOf(focus);
  });

  protected readonly Message = FocusSpellsMessage;
  protected readonly traditions = TRADITION_MESSAGES;
}

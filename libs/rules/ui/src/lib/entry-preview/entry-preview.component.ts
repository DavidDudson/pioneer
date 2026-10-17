import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HeadingLevel } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { StatBlockLayout } from '../creature-stat-block/creature-stat-block';
import { CreatureStatBlockView } from '../creature-stat-block/creature-stat-block.component';
import { EntryCardView } from './entry-card.component';
import type { EntryPreview } from './entry-preview';

/** Blocks of the description a preview shows: its opening, not the whole entry. */
const SUMMARY_BLOCKS = 1;

/**
 * The card a reference or row opens: name, level, traits, the opening of the description and where it comes from.
 * For an entry the character has with a value (frightened 2) it also shows the value and the statistics the entry
 * changes, with that value applied. A creature shows its stat block instead. It is presentational;
 * `pio-content-preview` finds the entry and places the card.
 *
 * ```html
 * <pio-entry-preview [preview]="preview" />
 * ```
 */
@Component({
  selector: 'pio-entry-preview',
  imports: [CreatureStatBlockView, EntryCardView],
  templateUrl: './entry-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPreviewView {
  public readonly preview = input.required<EntryPreview>();
  /** Shows the whole description rather than its opening, for a page that is about the entry. */
  public readonly full = input(false, { transform: booleanAttribute });
  /** The level of the entry's name, and of the headings in its text. */
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly summary = computed((): RichText => {
    const { summary } = this.preview();
    return this.full() ? summary : summary.slice(0, SUMMARY_BLOCKS);
  });

  /** A creature's stat block is whole wherever the description is, and a glance otherwise. */
  protected readonly statLayout = computed((): StatBlockLayout =>
    this.full() ? StatBlockLayout.Full : StatBlockLayout.Preview,
  );
}

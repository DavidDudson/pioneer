import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, HeadingLevel, Stack, Text } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';
import { SourceLineView } from '../source-line/source-line.component';
import { EntryEffectsView } from './entry-effects.component';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';

/** Blocks of the description a preview shows: its opening, not the whole entry. */
const SUMMARY_BLOCKS = 1;

/**
 * The card a reference or row opens: name, level, traits, the opening of the description and where it comes from.
 * For an entry the character has with a value (frightened 2) it also shows the value and the statistics the entry
 * changes, with that value applied. It is presentational; `pio-entry-hover` finds the entry and places the card.
 *
 * ```html
 * <pio-entry-preview [preview]="preview" />
 * ```
 */
@Component({
  selector: 'pio-entry-preview',
  imports: [Badge, EntryEffectsView, Heading, RichTextView, SourceLineView, Stack, Text, TranslocoPipe],
  templateUrl: './entry-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPreviewView {
  public readonly preview = input.required<EntryPreview>();
  /** Shows the whole description rather than its opening, for a page that is about the entry. */
  public readonly full = input(false, { transform: booleanAttribute });

  protected readonly Message = EntryPreviewMessage;
  /** The level of the entry's name, and of the headings in its text. */
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly summary = computed((): RichText => {
    const { summary } = this.preview();
    return this.full() ? summary : summary.slice(0, SUMMARY_BLOCKS);
  });
}

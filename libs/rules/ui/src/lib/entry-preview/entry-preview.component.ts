import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, HeadingLevel, Stack, Text } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';
import { SourceLineView } from '../source-line/source-line.component';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';

/** Blocks of the description a preview shows: its opening, not the whole entry. */
const SUMMARY_BLOCKS = 1;

/**
 * The card a reference or row opens: name, level, traits, the opening of the description and where it comes from.
 * It is presentational; `pio-entry-hover` finds the entry and places the card.
 *
 * ```html
 * <pio-entry-preview [preview]="preview" />
 * ```
 */
@Component({
  selector: 'pio-entry-preview',
  imports: [Badge, Heading, RichTextView, SourceLineView, Stack, Text, TranslocoPipe],
  templateUrl: './entry-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryPreviewView {
  public readonly preview = input.required<EntryPreview>();

  protected readonly Message = EntryPreviewMessage;
  protected readonly headingLevel = HeadingLevel.Three;
  protected readonly summary = computed((): RichText => this.preview().summary.slice(0, SUMMARY_BLOCKS));
}

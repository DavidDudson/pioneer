import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HeadingLevel, List, ListItem, Stack } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichBlock } from './rich-block/rich-block.component';

/**
 * Content text (a description, rules text) rendered from its document AST: frontier components only, every
 * string as text. List items are rich text themselves, so this component renders lists and nests itself in them.
 * Give the page's links and names with `provideRichTextLinks`.
 *
 * ```html
 * <pio-rich-text [text]="entry.description" />
 * ```
 */
@Component({
  selector: 'pio-rich-text',
  imports: [List, ListItem, RichBlock, Stack],
  templateUrl: './rich-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextView {
  public readonly text = input.required<RichText>();
  /** The outline level of the text's level-1 headings: one below the heading the text sits under. */
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Two);
}

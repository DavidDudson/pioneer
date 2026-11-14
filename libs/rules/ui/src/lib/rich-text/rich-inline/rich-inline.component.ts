import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ContentId, InlineContent } from '@pioneer/rules/sdk';

import { canPreview, ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';
import { RichMark } from '../rich-mark/rich-mark.component';
import { RichRef } from '../rich-ref/rich-ref.component';
import { RichRun } from '../rich-run/rich-run.component';
import { RichValue } from '../rich-value/rich-value.component';
import { linkConditionNames } from './condition-names';
import { linkTraitNames } from './trait-names';

/**
 * A run of inline nodes: a paragraph's or heading's content, or one table cell. The name of a condition in plain text
 * ("frightened 2") and a trait named before the word "trait" ("the incapacitation trait") open their cards as a
 * reference does, where the page can show them.
 */
@Component({
  selector: 'pio-rich-inline',
  imports: [RichMark, RichRef, RichRun, RichValue],
  templateUrl: './rich-inline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichInline {
  public readonly content = input.required<InlineContent>();

  readonly #previews = inject(ENTRY_PREVIEWS);

  protected readonly nodes = computed((): InlineContent => {
    const linkable = (id: ContentId): boolean => canPreview(this.#previews, id);
    // Any word before "trait" is a candidate, so only a trait the page holds is linked: a loader alone would link
    // "weapon trait" to a card that does not exist.
    const known = (id: ContentId): boolean => this.#previews.preview(id) !== undefined;
    return linkConditionNames(linkTraitNames(this.content(), known), linkable);
  });
}

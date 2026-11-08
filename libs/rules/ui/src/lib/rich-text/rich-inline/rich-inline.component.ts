import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { InlineContent } from '@pioneer/rules/sdk';

import { canPreview, ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';
import { RichMark } from '../rich-mark/rich-mark.component';
import { RichRef } from '../rich-ref/rich-ref.component';
import { RichRun } from '../rich-run/rich-run.component';
import { RichValue } from '../rich-value/rich-value.component';
import { linkConditionNames } from './condition-names';

/**
 * A run of inline nodes: a paragraph's or heading's content, or one table cell. The name of a condition in plain text
 * ("frightened 2") opens its card as a reference does, where the page can show it.
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

  protected readonly nodes = computed((): InlineContent =>
    linkConditionNames(this.content(), (id) => canPreview(this.#previews, id)),
  );
}

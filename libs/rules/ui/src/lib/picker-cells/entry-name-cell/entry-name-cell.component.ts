import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Link, Text } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { ContentPreview } from '../../entry-preview/content-preview.component';
import { canPreview, ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';

/**
 * An entry's name, as a link to the page that shows it when it has one, with a preview of the entry on hover and
 * focus when `entry` is given and the page can preview it.
 *
 * ```html
 * <pio-entry-name-cell name="Power Attack" [to]="['/content', 'feat', 'power-attack']" [entry]="featId" />
 * ```
 */
@Component({
  selector: 'pio-entry-name-cell',
  imports: [ContentPreview, Link, NgTemplateOutlet, Text],
  templateUrl: './entry-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryNameCell {
  public readonly name = input.required<string>();
  public readonly to = input<LinkTarget>();
  public readonly entry = input<ContentId>();

  readonly #previews = inject(ENTRY_PREVIEWS);
  /** Plain text can't be reached by keyboard, so a preview makes it a tab stop. */
  protected readonly previewable = computed((): boolean => {
    const entry = this.entry();
    return entry !== undefined && canPreview(this.#previews, entry);
  });
}

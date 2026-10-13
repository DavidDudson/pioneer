import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Text } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import type { RefNode } from '@pioneer/rules/sdk';

import { EntryHover } from '../../entry-preview/entry-hover.component';
import { ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';
import { RICH_TEXT_LINKS } from '../rich-text-links';
import { RichTextMessage } from '../rich-text-messages';

/** A reference to another entry: its label or name, linked when the page can open the entry. */
@Component({
  selector: 'pio-rich-ref',
  imports: [EntryHover, Link, Text, TranslocoPipe],
  templateUrl: './rich-ref.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichRef {
  public readonly node = input.required<RefNode>();

  readonly #links = inject(RICH_TEXT_LINKS);
  readonly #previews = inject(ENTRY_PREVIEWS);
  /** Plain text can't be reached by keyboard, so a preview makes it a tab stop. */
  protected readonly previewable = computed((): boolean => this.#previews.preview(this.node().id) !== undefined);
  protected readonly unnamed = RichTextMessage.UnnamedEntry;
  protected readonly label = computed((): string | undefined => this.node().label ?? this.#links.name(this.node().id));
  protected readonly target = computed((): LinkTarget | undefined => this.#links.target(this.node().id));
}

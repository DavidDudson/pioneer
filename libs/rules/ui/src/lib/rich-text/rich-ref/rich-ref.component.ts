import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Text } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import { ConditionValue } from '@pioneer/rules/sdk';
import type { RefNode } from '@pioneer/rules/sdk';

import { ContentPreview } from '../../entry-preview/content-preview.component';
import { canPreview, ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';
import { RICH_TEXT_LINKS } from '../rich-text-links';
import { RichTextMessage } from '../rich-text-messages';

/** The value a label ends with ("Frightened 2"), if it ends with one a condition could hold. */
const TRAILING_VALUE = /\s(?<value>\d{1,2})$/u;

/** A reference to another entry: its label or name, linked when the page can open the entry. */
@Component({
  selector: 'pio-rich-ref',
  imports: [ContentPreview, Link, Text, TranslocoPipe],
  templateUrl: './rich-ref.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichRef {
  public readonly node = input.required<RefNode>();

  readonly #links = inject(RICH_TEXT_LINKS);
  readonly #previews = inject(ENTRY_PREVIEWS);
  /** Plain text can't be reached by keyboard, so a preview makes it a tab stop. */
  protected readonly previewable = computed((): boolean => canPreview(this.#previews, this.node().id));
  protected readonly unnamed = RichTextMessage.UnnamedEntry;
  protected readonly label = computed((): string | undefined => this.node().label ?? this.#links.name(this.node().id));
  /** The value the label names, for a card of a condition to show; a card of anything else ignores it. */
  protected readonly value = computed((): ConditionValue | undefined => {
    const named = TRAILING_VALUE.exec(this.label() ?? '')?.groups?.['value'];
    const parsed = ConditionValue.safeParse(named === undefined ? undefined : Number(named));
    return parsed.success ? parsed.data : undefined;
  });
  protected readonly target = computed((): LinkTarget | undefined => this.#links.target(this.node().id));
}

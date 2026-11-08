import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { RichTextView } from '../rich-text/rich-text.component';
import { ContentPreview } from './content-preview.component';
import type { PreviewEnding } from './entry-preview';
import { ENDING_KIND_MESSAGES, EntryPreviewMessage } from './entry-preview-messages';

/**
 * How a condition the character has ends or eases: each way with its rule text, the DC of a check at the value the
 * character holds, the action that does it, and what the character has that helps. Presentational: the caller works
 * out the endings.
 *
 * ```html
 * <pio-entry-endings [endings]="preview.endings" />
 * ```
 */
@Component({
  selector: 'pio-entry-endings',
  imports: [Badge, ContentPreview, List, ListItem, RichTextView, Stack, Text, TranslocoPipe],
  templateUrl: './entry-endings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[hidden]': 'none()' },
})
export class EntryEndingsView {
  public readonly endings = input<readonly PreviewEnding[] | undefined>();

  /** The endings to list; none while the preview has none. */
  protected readonly listed = computed((): readonly PreviewEnding[] => this.endings() ?? []);

  /** Hides the heading too when there is nothing to list. */
  protected readonly none = computed((): boolean => this.listed().length === 0);

  protected readonly Message = EntryPreviewMessage;
  protected readonly KindMessage = ENDING_KIND_MESSAGES;
}

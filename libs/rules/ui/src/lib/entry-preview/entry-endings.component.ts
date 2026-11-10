import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { RichTextView } from '../rich-text/rich-text.component';
import { ContentPreview } from './content-preview.component';
import type { PreviewEnding } from './entry-preview';
import { ENDING_KIND_MESSAGES, EntryPreviewMessage } from './entry-preview-messages';

/** An ending with the text of the badges that go over its rule text. */
interface EndingRow {
  readonly ending: PreviewEnding;
  readonly badges: readonly string[];
}

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

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The endings to list; none while the preview has none. */
  protected readonly listed = computed((): readonly PreviewEnding[] => this.endings() ?? []);

  /** Hides the heading too when there is nothing to list. */
  protected readonly none = computed((): boolean => this.listed().length === 0);

  /** Each ending with the badges over its text: its DC, then the modifier the character rolls at for each statistic. */
  protected readonly rows = computed((): readonly EndingRow[] => {
    this.#messages();
    this.#format.locale();
    return this.listed().map((ending) => ({ ending, badges: this.#badges(ending) }));
  });

  #badges({ dc, against }: PreviewEnding): readonly string[] {
    const dcBadge = dc === undefined ? [] : [this.#i18n.translate(EntryPreviewMessage.EndingDc, { dc })];
    const rolls = against.map(({ name, modifier }) =>
      this.#i18n.translate(EntryPreviewMessage.EndingAgainst, {
        statistic: name,
        modifier: this.#format.number(modifier, { signDisplay: 'always' }),
      }),
    );
    return [...dcBadge, ...rolls];
  }

  protected readonly Message = EntryPreviewMessage;
  protected readonly KindMessage = ENDING_KIND_MESSAGES;
}

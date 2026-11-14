import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { ContentPreview } from './content-preview.component';
import { EaseEffect } from './entry-preview';
import type { PreviewEaseOption } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';

/** An option with what it does to the condition, and how many are left, worded. */
interface EaseRow {
  readonly option: PreviewEaseOption;
  readonly effect: string;
  readonly left: string | undefined;
}

/**
 * What the character has that ends or eases a condition it holds: each spell, feat, action or consumable with what it
 * does to the condition and whether the character can use it now. Presentational: the caller works out the options.
 *
 * ```html
 * <pio-entry-ease-options [options]="preview.easeOptions" />
 * ```
 */
@Component({
  selector: 'pio-entry-ease-options',
  imports: [Badge, ContentPreview, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './entry-ease-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[hidden]': 'none()' },
})
export class EntryEaseOptionsView {
  public readonly options = input<readonly PreviewEaseOption[] | undefined>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The options to list; none while the preview has none. */
  protected readonly listed = computed((): readonly PreviewEaseOption[] => this.options() ?? []);

  /** Hides the heading too when there is nothing to list. */
  protected readonly none = computed((): boolean => this.listed().length === 0);

  protected readonly rows = computed((): readonly EaseRow[] => {
    this.#messages();
    this.#format.locale();
    return this.listed().map((option) => ({
      option,
      effect: this.#effect(option),
      left:
        option.left === undefined
          ? undefined
          : this.#i18n.translate(EntryPreviewMessage.EaseLeft, { left: this.#format.number(option.left) }),
    }));
  });

  #effect({ effect, by, rank }: PreviewEaseOption): string {
    if (effect === EaseEffect.Remove) {
      return this.#i18n.translate(EntryPreviewMessage.EaseRemove);
    }
    if (effect === EaseEffect.Lower) {
      return this.#i18n.translate(EntryPreviewMessage.EaseLower, { by: by ?? 1 });
    }
    return rank === undefined
      ? this.#i18n.translate(EntryPreviewMessage.EaseCounteract)
      : this.#i18n.translate(EntryPreviewMessage.EaseCounteractRanked, { rank });
  }

  protected readonly Message = EntryPreviewMessage;
}

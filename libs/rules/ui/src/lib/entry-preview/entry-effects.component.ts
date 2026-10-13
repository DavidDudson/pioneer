import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import { filter, merge } from 'rxjs';

import { LINE_STATUS_MESSAGES } from '../breakdown/breakdown-messages';
import { lineValue } from '../breakdown/line-words';
import type { PreviewEffect } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';

/**
 * The lines an entry adds to a character's statistics, worded ("Perception -2 status"), or that it adds none. A line
 * that does not count says why. Presentational: the caller finds the lines.
 *
 * ```html
 * <pio-entry-effects [effects]="preview.effects" />
 * ```
 */
@Component({
  selector: 'pio-entry-effects',
  imports: [List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './entry-effects.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryEffectsView {
  public readonly effects = input.required<readonly PreviewEffect[]>();

  protected readonly Message = EntryPreviewMessage;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly worded = computed((): readonly string[] => {
    this.#messages();
    this.#format.locale();
    return this.effects().map((effect) => this.#effect(effect));
  });

  /** "Perception -2 status", with the reason it doesn't count when it doesn't. */
  #effect({ statistic, line }: PreviewEffect): string {
    const value = lineValue(line, this.#i18n, this.#format);
    if (line.status.kind === LineStatusKind.Applied) {
      return this.#i18n.translate(EntryPreviewMessage.Effect, { statistic, value });
    }
    const status: string = this.#i18n.translate(LINE_STATUS_MESSAGES[line.status.kind]);
    return this.#i18n.translate(EntryPreviewMessage.EffectMarked, { statistic, value, status });
  }
}

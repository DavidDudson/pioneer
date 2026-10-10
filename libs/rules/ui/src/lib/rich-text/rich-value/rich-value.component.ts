import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleFormat, Text } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { RICH_TEXT_LINKS } from '../rich-text-links';
import { valueText } from './value-text';
import type { ValueNode } from './value-text';

/** A check, damage, area or duration inside text, set off so it reads as something to roll or measure. */
@Component({
  selector: 'pio-rich-value',
  imports: [Text],
  templateUrl: './rich-value.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichValue {
  public readonly node = input.required<ValueNode>();

  readonly #links = inject(RICH_TEXT_LINKS);
  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The author's own wording if the node gives one, else the generated text. */
  protected readonly text = computed((): string => {
    const node = this.node();
    if ('label' in node && node.label !== undefined) {
      return node.label;
    }
    this.#messages();
    return valueText(node, {
      links: this.#links,
      format: this.#format,
      translate: (key, params) => this.#i18n.translate(key, params),
    });
  });
}

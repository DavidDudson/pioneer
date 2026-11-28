import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { injectTranslate, List, ListItem, LocaleFormat, Text } from '@pioneer/frontier';

import { ContentPreview } from '../../entry-preview/content-preview.component';
import { ShopMessage } from '../shop-offer';
import type { KitLine } from '../shop-offer';

/**
 * What a kit holds: each item with how many (just its name for one), and under a container what it holds (a
 * backpack's rope and torches), as the kit adds them to the inventory.
 */
@Component({
  selector: 'pio-kit-contents',
  imports: [ContentPreview, List, ListItem, Text],
  templateUrl: './kit-contents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitContents {
  public readonly lines = input.required<ReadonlyArray<KitLine>>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Re-read when the messages load or the language changes, so a line is never a raw key. */
  readonly #messages = injectTranslate();

  protected text({ name, quantity }: KitLine): string {
    this.#messages();

    return quantity === 1
      ? name
      : this.#i18n.translate(ShopMessage.KitLine, { count: this.#format.number(quantity), name });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { KeyPropertyRune, ReviewedRuneId } from '@pioneer/campaign/domain';
import { Button, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';

import { KEY_ITEM_CONTENT_SEARCH } from '../../data/key-item-content-search';
import type { ContentChoice } from '../../data/key-item-content-search';

/**
 * The property runes a new key item carries, one picked at a time from the rules content by name. The GM states them
 * as they are, so there is no cap here beyond what a line stores (ADR-0064).
 */
@Component({
  selector: 'pio-campaign-key-item-runes',
  imports: [Button, Combobox, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-key-item-runes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemRunes {
  /** The property runes picked so far, in the order they were picked. */
  public readonly runes = model<readonly KeyPropertyRune[]>([]);

  readonly #search = inject(KEY_ITEM_CONTENT_SEARCH);
  readonly #found = signal<readonly ContentChoice[]>([]);

  protected readonly loading = signal(false);
  /** The matches for the last search, less the runes already picked. */
  protected readonly options = computed((): readonly SelectOption<ReviewedRuneId>[] => {
    const picked = new Set(this.runes().map(({ rune }) => rune));
    return this.#found()
      .filter(({ id }) => !picked.has(id))
      .map(({ id, name }) => ({ value: id, label: name }));
  });

  protected async find(words: string): Promise<void> {
    this.loading.set(true);
    try {
      this.#found.set(await this.#search.runes(words));
    } finally {
      this.loading.set(false);
    }
  }

  protected add(id: ReviewedRuneId | undefined): void {
    const found = this.#found().find((each) => each.id === id);
    if (found !== undefined) {
      this.runes.update((runes) => [...runes, { rune: found.id, name: found.name }]);
    }
  }

  protected remove(rune: ReviewedRuneId): void {
    this.runes.update((runes) => runes.filter((each) => each.rune !== rune));
  }
}

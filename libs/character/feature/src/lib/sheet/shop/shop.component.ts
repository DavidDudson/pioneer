import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { itemContent } from '@pioneer/character/domain';
import type { ItemContent, ItemEntry } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Heading,
  LocaleFormat,
  SearchInput,
  Stack,
  Text,
  ToggleButton,
} from '@pioneer/frontier';
import { filterFromQuery, filterToQuery, Level } from '@pioneer/rules/sdk';
import type { ContentId, FilterState, QueryParams } from '@pioneer/rules/sdk';
import { FacetFilterView, ShopOffersView } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { INVENTORY_CONTENT_KINDS } from '../inventory/sheet-inventory';
import { ShopGift } from './shop-gift.component';
import { SHOP_FACETS, shopList } from './shop-list';
import type { ShopList } from './shop-list';

const NO_PARAMS: QueryParams = {};
const EMPTY_LIST: ShopList = { counts: [], offers: [] };

/** Every facet's query param cleared, so a facet the new state drops leaves the URL. */
const CLEARED: Readonly<Record<string, undefined>> = Object.fromEntries(
  SHOP_FACETS.map((facet) => [`f.${facet.id}`, undefined]),
);

/**
 * The shop (character-model.md, "Shop"): the items the loaded packs offer, opening on **Available to you** for this
 * character, with a toggle that shows everything, a name search and the equipment filters, whose state is in the URL
 * (`f.<facet>`), so a filtered shop can be linked. Pick an item, then add it without paying. The Downtime tab adopts
 * it when sheet modes land (#517).
 */
@Component({
  selector: 'pio-shop',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    FacetFilterView,
    Heading,
    SearchInput,
    ShopGift,
    ShopOffersView,
    Stack,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './shop.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shop {
  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #params = toSignal(this.#route.queryParams, { initialValue: NO_PARAMS });

  /** The same query the inventory loads, so the item kinds load once. */
  protected readonly items = injectContentRegistry(INVENTORY_CONTENT_KINDS);
  protected readonly content: Signal<ItemContent | undefined> = computed(() => {
    const registry = this.items.data();
    return registry === undefined ? undefined : itemContent(registry);
  });

  protected readonly everything = signal(false);
  readonly #search = signal('');
  protected readonly picked = signal<ContentId | undefined>(undefined);

  protected readonly level: Signal<Level | undefined> = computed(() => {
    const level = this.#store.selected()?.document.level;
    return level === undefined ? undefined : Level.parse(level);
  });
  protected readonly state: Signal<FilterState> = computed(() => filterFromQuery(this.#params(), SHOP_FACETS));

  protected readonly list: Signal<ShopList> = computed(() => {
    const content = this.content();
    const level = this.level();
    if (content === undefined || level === undefined) {
      return EMPTY_LIST;
    }
    const query = { level, everything: this.everything(), search: this.#search(), state: this.state() };
    return shopList(content, query, (left, right) => this.#format.compare(left, right));
  });

  /** The picked item while the list still offers it. */
  protected readonly pickedItem: Signal<ItemEntry | undefined> = computed(() => {
    const id = this.picked();
    const offered = this.list().offers.some((offer) => offer.id === id);
    return id === undefined || !offered ? undefined : this.content()?.get(id);
  });

  protected search(query: string): void {
    this.#search.set(query);
  }

  protected async filter(state: FilterState): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { ...CLEARED, ...filterToQuery(state, SHOP_FACETS) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cleared(): void {
    this.picked.set(undefined);
  }
}

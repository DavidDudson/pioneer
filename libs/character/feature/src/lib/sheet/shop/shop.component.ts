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
import { availableItems, filterFromQuery, filterToQuery, Level } from '@pioneer/rules/sdk';
import type { ContentId, FilterState, QueryParams } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS, FacetFilterView, ShopOffersView } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { INVENTORY_CONTENT_KINDS } from '../inventory/sheet-inventory';
import { sheetEntryPreviews } from '../sheet-entry-previews';
import { ShopKits } from './shop-kits.component';
import { SHOP_FACETS, shopList } from './shop-list';
import type { ShopList } from './shop-list';
import { ShopOrder } from './shop-order.component';

const NO_PARAMS: QueryParams = {};

/** Every facet's query param cleared, so a facet the new state drops leaves the URL. */
const CLEARED: Readonly<Record<string, undefined>> = Object.fromEntries(
  SHOP_FACETS.map((facet) => [`f.${facet.id}`, undefined]),
);

/**
 * The shop (character-model.md, "Shop"): the items the loaded packs offer, opening on **Available to you** for this
 * character, with a toggle that shows everything, a name search and the equipment filters, whose state is in the URL
 * (`f.<facet>`), so a filtered shop can be linked. Pick an item, then buy it or add it without paying. Kits sit below
 * the items, each bought or added whole (`pio-shop-kits`). The Downtime tab adopts it when sheet modes land (#517).
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
    ShopKits,
    ShopOffersView,
    ShopOrder,
    Stack,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './shop.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(Shop).previews }],
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
  /** What an offer and a kit's items preview on hover, read from the loaded items. */
  public readonly previews: EntryPreviews = sheetEntryPreviews(() => this.items.data());
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
  /** Whether the URL holds the player's own filters, rather than the shop opening fresh. */
  readonly #linked = computed(() => filterFromQuery(this.#params(), SHOP_FACETS).size > 0);
  /** The preset is in force: no filters of the player's yet, and everything isn't shown. */
  protected readonly preset = computed(() => !this.#linked() && !this.everything());

  /**
   * The filters in force: the URL's, else **Available to you** as a starting point whose every facet the player can
   * change (content-model.md, "Filters"), else none once everything is shown.
   */
  protected readonly state: Signal<FilterState> = computed(() => {
    const level = this.level();
    if (this.preset() && level !== undefined) {
      return availableItems(level);
    }
    return filterFromQuery(this.#params(), SHOP_FACETS);
  });

  /** Undefined while the items or the character load: the preset needs the character's level. */
  protected readonly list: Signal<ShopList | undefined> = computed(() => {
    const content = this.content();
    const waiting = this.preset() && this.level() === undefined;
    if (content === undefined || waiting) {
      return undefined;
    }
    const query = { search: this.#search(), state: this.state() };
    return shopList(content, query, (left, right) => this.#format.compare(left, right));
  });

  /**
   * The picked item while the list still offers it, as a list of at most one, so its form is made afresh for each
   * item (`track` by id) rather than carrying the last item's quantity or error over. The form stays after a gift,
   * so its tick shows and focus stays on its button.
   */
  protected readonly pickedItems: Signal<readonly ItemEntry[]> = computed(() => {
    const id = this.picked();
    const offered = this.list()?.offers.some((offer) => offer.id === id) === true;
    const item = id === undefined || !offered ? undefined : this.content()?.get(id);
    return item === undefined ? [] : [item];
  });

  protected search(query: string): void {
    this.#search.set(query);
  }

  /** The player's filters replace the preset; with none left, the shop shows everything. */
  protected async filter(state: FilterState): Promise<void> {
    this.everything.set(state.size === 0);
    await this.#write(state);
  }

  /** Shows everything, or goes back to the preset: either way the player's filters are dropped. */
  protected async showEverything(on: boolean): Promise<void> {
    this.everything.set(on);
    await this.#write(new Map());
  }

  async #write(state: FilterState): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { ...CLEARED, ...filterToQuery(state, SHOP_FACETS) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

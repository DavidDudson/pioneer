import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { kitContent } from '@pioneer/character/domain';
import type { ItemContent, KitEntry } from '@pioneer/character/domain';
import { Heading, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { ShopOffersView } from '@pioneer/rules/ui';
import type { ShopOffer } from '@pioneer/rules/ui';

import { injectContentRegistry } from '../../data/content-registry-query';
import { ShopKitOrder } from './shop-kit-order.component';

/** The kits query: kits only, as the item kinds load in their own. */
const KIT_KINDS: readonly ContentKind[] = [ContentKind.Kit];

function offerOf({ id, name, rarity, data }: KitEntry): ShopOffer {
  return { id, name, level: undefined, rarity, price: data.price };
}

/**
 * The shop's kits (character-model.md, "Shop"): every kit the loaded packs offer, by name, each with its price. Pick
 * one to see what it holds, then buy it or add it without paying; either adds every item in it at once. Hidden once
 * the kits load and no pack offers one.
 */
@Component({
  selector: 'pio-shop-kits',
  imports: [Heading, ShopKitOrder, ShopOffersView, Stack, Text, TranslocoPipe],
  templateUrl: './shop-kits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopKits {
  /** The items the loaded packs offer, for the names of what a kit holds and where it can go. */
  public readonly content = input.required<ItemContent>();

  readonly #format = inject(LocaleFormat);

  protected readonly kits = injectContentRegistry(KIT_KINDS);
  protected readonly picked = signal<ContentId | undefined>(undefined);

  readonly #entries: Signal<readonly KitEntry[] | undefined> = computed(() => {
    const registry = this.kits.data();
    return registry === undefined ? undefined : [...kitContent(registry).values()];
  });

  /** The kits by name; undefined while they load. */
  protected readonly offers: Signal<readonly ShopOffer[] | undefined> = computed(() =>
    this.#entries()
      ?.toSorted((left, right) => this.#format.compare(left.name, right.name))
      .map((entry) => offerOf(entry)),
  );

  /** The picked kit, as a list of at most one, so its form is made afresh for each kit (`track` by id). */
  protected readonly pickedKits: Signal<readonly KitEntry[]> = computed(() => {
    const id = this.picked();
    const kit = this.#entries()?.find((entry) => entry.id === id);
    return kit === undefined ? [] : [kit];
  });
}

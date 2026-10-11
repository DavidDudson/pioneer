import { Coin } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveUuid } from './entry-references';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { systemOf } from './kind-fields';

/**
 * A kit's `data` from Foundry's `kit` item: its items by content id, with what a container holds, and its price.
 * Foundry nests a container's items without limit; a kit goes one level deep, so anything deeper is reported.
 */

export const KIT_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, 'items', 'price']);

const FIELD_MAX = 64;
const NAME_MAX = 500;

interface FoundryKitItem {
  readonly uuid: string;
  readonly quantity: number;
  readonly items: Readonly<Record<string, FoundryKitItem>>;
}

const FoundryKitItem: z.ZodType<FoundryKitItem> = z.looseObject({
  uuid: z.string().max(NAME_MAX),
  quantity: z.number(),
  get items() {
    return z.record(z.string().max(FIELD_MAX), FoundryKitItem).default({});
  },
});

const FoundryKitItems = z.record(z.string().max(FIELD_MAX), FoundryKitItem);
const FoundryCoins = z.record(z.string().max(FIELD_MAX), z.number());

const FoundryKitSystem = z.looseObject({
  items: FoundryKitItems.default({}),
  price: z.looseObject({ value: FoundryCoins }).optional(),
});

const COINS: readonly Coin[] = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper];

interface KitItem {
  readonly item: ContentId;
  readonly quantity: number;
}

function itemOf({ uuid, quantity }: FoundryKitItem, field: string, { references, log }: KindInput): KitItem[] {
  const item = resolveUuid(references, uuid);
  if (item === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field, raw: uuid });
  }
  return item === undefined ? [] : [{ item, quantity }];
}

/** A container's contents, one level deep; a container inside it is reported. */
function contentsOf(items: Readonly<Record<string, FoundryKitItem>>, input: KindInput): object {
  const contents = Object.values(items).flatMap((inner) => {
    if (Object.keys(inner.items).length > 0) {
      report(input.log, { reason: KindDataGapReason.UnmappedValue, field: 'items.items.items', raw: inner.uuid });
    }
    return itemOf(inner, 'items.items', input);
  });
  return contents.length === 0 ? {} : { contents };
}

/** Foundry's coins with the unpaid ones left out; no price when all are zero. */
function priceOf(coins: Readonly<Record<string, number>> | undefined): object {
  const paid = COINS.filter((coin) => (coins?.[coin] ?? 0) > 0).map((coin) => [coin, coins?.[coin]] as const);
  return paid.length === 0 ? {} : { price: { coins: Object.fromEntries(paid) } };
}

/** The kit's data, unparsed; undefined when its `system` is not shaped as a kit's. */
export function kitData(input: KindInput): object | undefined {
  const system = systemOf(FoundryKitSystem, input);
  if (system === undefined) {
    return undefined;
  }
  const items = Object.values(system.items).flatMap((outer) => {
    const contents = contentsOf(outer.items, input);
    const [item] = itemOf(outer, 'items', input);
    return item === undefined ? [] : [{ ...item, ...contents }];
  });
  return { ...priceOf(system.price?.value), items };
}

import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveUuid } from './entry-references';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { boundedRecord, systemOf } from './kind-fields';
import { priceOf } from './physical-fields';

/**
 * A kit's `data` from Foundry's `kit` item: its items by content id, with what a container holds, and its price.
 * Foundry nests a container's items without limit; a kit goes one level deep, so anything deeper is reported.
 */

export const KIT_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, 'items', 'price']);

const NAME_MAX = 500;

const kitItem = { uuid: z.string().max(NAME_MAX), quantity: z.number() };

/** An item inside a container; what it holds in turn is only counted, as a kit goes one level deep. */
const FoundryInnerItem = z.looseObject({ ...kitItem, items: boundedRecord(z.unknown()).default({}) });
const FoundryKitItem = z.looseObject({ ...kitItem, items: boundedRecord(FoundryInnerItem).default({}) });
type FoundryInnerItem = z.infer<typeof FoundryInnerItem>;

const FoundryKitItems = boundedRecord(FoundryKitItem);
const FoundryCoins = boundedRecord(z.number());

const FoundryKitSystem = z.looseObject({
  items: FoundryKitItems.default({}),
  price: z.looseObject({ value: FoundryCoins }).optional(),
});

interface KitItem {
  readonly item: ContentId;
  readonly quantity: number;
}

function itemOf({ uuid, quantity }: FoundryInnerItem, field: string, { references, log }: KindInput): KitItem[] {
  const item = resolveUuid(references, uuid);
  if (item === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field, raw: uuid });
  }
  return item === undefined ? [] : [{ item, quantity }];
}

/** A container's contents, one level deep; a container inside it is reported. */
function contentsOf(items: Readonly<Record<string, FoundryInnerItem>>, input: KindInput): object {
  const contents = Object.values(items).flatMap((inner) => {
    if (Object.keys(inner.items).length > 0) {
      report(input.log, { reason: KindDataGapReason.UnmappedValue, field: 'items.items.items', raw: inner.uuid });
    }
    return itemOf(inner, 'items.items', input);
  });
  return contents.length === 0 ? {} : { contents };
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
  return { ...priceOf(system.price), items };
}

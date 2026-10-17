import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/** The items an actor embeds, and the bounds every creature item translator reads them with. */

const FIELD_MAX = 64;
const LIST_MAX = 64;
const ITEMS_MAX = 500;
const NAME_MAX = 500;

export const Name = z.string().max(NAME_MAX);
export const Slug = z.string().max(FIELD_MAX);
export const Slugs = z.array(Slug).max(LIST_MAX);
export const Count = z.looseObject({ value: z.number() });
export const Traits = z.looseObject({ value: Slugs.default([]) });

/** An item embedded in an actor, its `system` read per type by the translator for that type. */
const Embedded = z.looseObject({ _id: Name, name: Name, type: Slug, system: z.looseObject({}).default({}) });
export type Embedded = z.infer<typeof Embedded>;
const EmbeddedList = z.array(Embedded).max(ITEMS_MAX);

/** The actor's items, parsed; reported when the list is not shaped as an actor's. */
export function embeddedOf({ document, log }: KindInput): readonly Embedded[] {
  const items = EmbeddedList.safeParse(document['items'] ?? []);
  if (!items.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: 'items', raw: z.prettifyError(items.error) });
  }
  return items.data ?? [];
}

/** An item's `system` as `schema` reads it; reported with the item's name when it is not shaped so. */
export function itemSystem<System>(schema: z.ZodType<System>, item: Embedded, input: KindInput): System | undefined {
  const system = schema.safeParse(item.system);
  if (!system.success) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: `items.${item.type}`, raw: item.name });
  }
  return system.data;
}

/** The items of one Foundry type. */
export function itemsOfType(items: readonly Embedded[], type: string): readonly Embedded[] {
  return items.filter((item) => item.type === type);
}

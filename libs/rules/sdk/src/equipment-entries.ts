import * as z from 'zod';

import { ContentKind } from './content-kind';
import { address, envelope } from './entry-envelope';
import { KIND_DATA_MODEL } from './kind-data';
import { ContentLevel } from './units';

/** An item always has a level, 0 to 30, as in Foundry pf2e. */
const item = { ...envelope, level: ContentLevel };

/** A kit has no level of its own. */
const { level: _level, ...kit } = envelope;

/** The `Entry` arms (`content-entry.ts`) of the equipment kinds, by kind. */
export const EQUIPMENT_ARMS = {
  [ContentKind.Armor]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Armor),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Armor],
  }),
  [ContentKind.Consumable]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Consumable),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Consumable],
  }),
  [ContentKind.Equipment]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Equipment),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Equipment],
  }),
  [ContentKind.Kit]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Kit),
    ...kit,
    data: KIND_DATA_MODEL[ContentKind.Kit],
  }),
  [ContentKind.Rune]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Rune),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Rune],
  }),
  [ContentKind.Shield]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Shield),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Shield],
  }),
  [ContentKind.Treasure]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Treasure),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Treasure],
  }),
  [ContentKind.Weapon]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Weapon),
    ...item,
    data: KIND_DATA_MODEL[ContentKind.Weapon],
  }),
} as const;

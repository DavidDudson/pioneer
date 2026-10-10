import * as z from 'zod';

import { ContentKind } from './content-kind';
import { address, envelope } from './entry-envelope';
import { KIND_DATA } from './kind-data';
import { ContentLevel } from './units';

/** An item always has a level, 0 to 30, as in Foundry pf2e. */
const item = { ...envelope, level: ContentLevel };

/** A kit has no level of its own. */
const { level: _level, ...kit } = envelope;

/** The `Entry` arms (`content-entry.ts`) of the equipment kinds. */
export const EQUIPMENT_ENTRIES = [
  z.strictObject({ ...address, kind: z.literal(ContentKind.Armor), ...item, data: KIND_DATA[ContentKind.Armor] }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Consumable),
    ...item,
    data: KIND_DATA[ContentKind.Consumable],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Equipment),
    ...item,
    data: KIND_DATA[ContentKind.Equipment],
  }),
  z.strictObject({ ...address, kind: z.literal(ContentKind.Kit), ...kit, data: KIND_DATA[ContentKind.Kit] }),
  z.strictObject({ ...address, kind: z.literal(ContentKind.Rune), ...item, data: KIND_DATA[ContentKind.Rune] }),
  z.strictObject({ ...address, kind: z.literal(ContentKind.Shield), ...item, data: KIND_DATA[ContentKind.Shield] }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Treasure),
    ...item,
    data: KIND_DATA[ContentKind.Treasure],
  }),
  z.strictObject({ ...address, kind: z.literal(ContentKind.Weapon), ...item, data: KIND_DATA[ContentKind.Weapon] }),
] as const;

import * as z from 'zod';

import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { bulkOf, FoundryPhysicalSystem, PHYSICAL_FIELDS, physicalData, stackSize, usageField } from './physical-fields';
import type { FoundryBulk } from './physical-fields';

/**
 * Equipment's `data` from Foundry's `equipment` item and from its `backpack` item, a container (ADR-0023), and
 * treasure's from its `treasure` item. Whether a container is open on the sheet is UI state, not content.
 */

export const EQUIPMENT_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, ...PHYSICAL_FIELDS, 'usage', 'apex']);

export const BACKPACK_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...PHYSICAL_FIELDS,
  'usage',
  'stowing',
  'collapsed',
]);

export const TREASURE_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, ...PHYSICAL_FIELDS, 'category']);

const FIELD_MAX = 64;

const FoundryEquipmentSystem = FoundryPhysicalSystem.extend({
  apex: z.looseObject({ attribute: z.string().max(FIELD_MAX).nullish() }).nullish(),
});

const FoundryBackpackSystem = FoundryPhysicalSystem.extend({ stowing: z.boolean().nullish() });

const FoundryTreasureSystem = FoundryPhysicalSystem.extend({ category: z.string().max(FIELD_MAX).nullish() });

/** The equipment's data, unparsed; undefined when its `system` is not shaped as equipment's or its Bulk does not map. */
export function equipmentData(input: KindInput): object | undefined {
  const system = systemOf(FoundryEquipmentSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  return {
    ...physical,
    ...usageField(system, input.log),
    ...setFields({ apex: system.apex?.attribute ?? undefined }),
  };
}

/**
 * What a container holds, how much of it is ignored however it is carried, and its Bulk held or stowed when that
 * differs from worn. A capacity of 0 would read as no limit, so it is reported and the container left out.
 */
function containerOf(bulk: FoundryBulk | null | undefined, log: GapLog): object | undefined {
  const capacity = bulk?.capacity ?? 0;
  if (capacity <= 0) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'bulk.capacity', raw: capacity });
    return undefined;
  }
  const held = bulk?.heldOrStowed ?? undefined;
  const heldBulk = held === undefined || held === bulk?.value ? undefined : bulkOf(held);
  if (held !== undefined && held !== bulk?.value && heldBulk === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'bulk.heldOrStowed', raw: held });
  }
  return { capacity, ...setFields({ ignored: (bulk?.ignored ?? 0) > 0 ? bulk?.ignored : undefined, heldBulk }) };
}

/**
 * A container's data, unparsed: equipment with a `container`. One whose contents Foundry does not count as stowed
 * (a sack) is reported, as Pioneer has no place for that.
 */
export function backpackData(input: KindInput): object | undefined {
  const system = systemOf(FoundryBackpackSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const { log } = input;
  if (system.stowing === false) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'stowing', raw: false });
  }
  return { ...physical, ...usageField(system, log), ...setFields({ container: containerOf(system.bulk, log) }) };
}

/** Treasure's data, unparsed: its category, and for coins and gems the stack its Bulk is for. */
export function treasureData(input: KindInput): object | undefined {
  const system = systemOf(FoundryTreasureSystem, input);
  const category = system?.category ?? undefined;
  const physical = system && physicalData(system, input, stackSize(category));
  return physical && { ...physical, ...setFields({ category }) };
}

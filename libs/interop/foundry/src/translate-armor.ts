import * as z from 'zod';

import { FoundryRunes, itemRunes } from './item-runes';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { FoundryPhysicalSystem, PHYSICAL_FIELDS, physicalData } from './physical-fields';

/**
 * Armour's `data` from Foundry's `armor` item and a shield's from its `shield` item. Foundry stores check and speed
 * penalties negative; here they are their size (ADR-0023). A shield's hardness and Hit Points are required, so a
 * shield with none has no data. Foundry's `specific` repeats the runes and material the item already has.
 */

const ITEM_FIELDS = [
  ...ENVELOPE_FIELDS,
  ...PHYSICAL_FIELDS,
  'baseItem',
  'acBonus',
  'speedPenalty',
  'runes',
  'specific',
];

export const ARMOR_FIELDS: ReadonlySet<string> = new Set([
  ...ITEM_FIELDS,
  'category',
  'group',
  'dexCap',
  'checkPenalty',
  'strength',
]);

export const SHIELD_FIELDS: ReadonlySet<string> = new Set(ITEM_FIELDS);

const FIELD_MAX = 64;

const itemFields = {
  baseItem: z.string().max(FIELD_MAX).nullish(),
  acBonus: z.number(),
  speedPenalty: z.number().nullish(),
  runes: FoundryRunes.nullish(),
};

const FoundryArmorSystem = FoundryPhysicalSystem.extend({
  ...itemFields,
  category: z.string().max(FIELD_MAX),
  group: z.string().max(FIELD_MAX).nullish(),
  dexCap: z.number().nullish(),
  checkPenalty: z.number().nullish(),
  strength: z.number().nullish(),
});

const FoundryShieldSystem = FoundryPhysicalSystem.extend(itemFields);

/** A penalty Foundry stores negative, as its size; none when it is 0. */
function penalty(value: number | null | undefined): number | undefined {
  return value === null || value === undefined || value === 0 ? undefined : -value;
}

/** The armour's data, unparsed; undefined when its `system` is not shaped as armour's or its Bulk does not map. */
export function armorData(input: KindInput): object | undefined {
  const system = systemOf(FoundryArmorSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  return {
    ...physical,
    category: system.category,
    acBonus: system.acBonus,
    ...setFields({
      group: system.group ?? undefined,
      baseItem: system.baseItem ?? undefined,
      dexCap: system.dexCap ?? undefined,
      checkPenalty: penalty(system.checkPenalty),
      speedPenalty: penalty(system.speedPenalty),
      strength: system.strength ?? undefined,
      runes: system.runes ? itemRunes(system.runes, ['potency', 'resilient'], input) : undefined,
    }),
  };
}

/**
 * The shield's data, unparsed; undefined when its `system` is not shaped as a shield's or its Bulk does not map. A
 * shield has only a reinforcing rune; property runes on one are reported.
 */
export function shieldData(input: KindInput): object | undefined {
  const system = systemOf(FoundryShieldSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const reinforcing = system.runes?.reinforcing ?? 0;
  if ((system.runes?.property.length ?? 0) > 0) {
    report(input.log, {
      reason: KindDataGapReason.UnmappedValue,
      field: 'runes.property',
      raw: system.runes?.property,
    });
  }
  return {
    ...physical,
    acBonus: system.acBonus,
    ...setFields({
      baseItem: system.baseItem ?? undefined,
      speedPenalty: penalty(system.speedPenalty),
      runes: reinforcing > 0 ? { reinforcing } : undefined,
    }),
  };
}

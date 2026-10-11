import {
  ArmorData,
  ConsumableData,
  ContentKind,
  EquipmentData,
  RuneData,
  ShieldData,
  TreasureData,
  WeaponData,
} from '@pioneer/rules/sdk';

import { FoundryItemType } from './foundry-document';
import { parsedWith } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { ARMOR_FIELDS, armorData, SHIELD_FIELDS, shieldData } from './translate-armor';
import { AMMO_FIELDS, ammoData, CONSUMABLE_FIELDS, consumableData } from './translate-consumable';
import {
  BACKPACK_FIELDS,
  backpackData,
  EQUIPMENT_FIELDS,
  equipmentData,
  TREASURE_FIELDS,
  treasureData,
} from './translate-equipment';
import { RUNE_FIELDS, runeData } from './translate-rune';
import { WEAPON_FIELDS, weaponData } from './translate-weapon';

/**
 * Kind `data` for the equipment kinds (content-model.md, "Equipment data"), which `translateKindData` takes in with
 * the rest. Foundry's `ammo` items are consumables and its `backpack` items equipment (ADR-0023), so those two kinds
 * read their document's type to pick the builder; a rune is equipment `documentKind` files under `rune`.
 */

export type EquipmentKindData =
  | { readonly kind: typeof ContentKind.Armor; readonly data: ArmorData }
  | { readonly kind: typeof ContentKind.Consumable; readonly data: ConsumableData }
  | { readonly kind: typeof ContentKind.Equipment; readonly data: EquipmentData }
  | { readonly kind: typeof ContentKind.Rune; readonly data: RuneData }
  | { readonly kind: typeof ContentKind.Shield; readonly data: ShieldData }
  | { readonly kind: typeof ContentKind.Treasure; readonly data: TreasureData }
  | { readonly kind: typeof ContentKind.Weapon; readonly data: WeaponData };

type EquipmentTranslator = (input: KindInput) => EquipmentKindData | undefined;

export const EQUIPMENT_TRANSLATORS: Readonly<Partial<Record<ContentKind, EquipmentTranslator>>> = {
  [ContentKind.Armor]: (input) => {
    const data = parsedWith({ schema: ArmorData, fields: ARMOR_FIELDS, build: armorData }, input);
    return data && { kind: ContentKind.Armor, data };
  },
  [ContentKind.Consumable]: (input) => {
    const ammo = input.document.type === FoundryItemType.Ammo;
    const data = parsedWith(
      ammo
        ? { schema: ConsumableData, fields: AMMO_FIELDS, build: ammoData }
        : { schema: ConsumableData, fields: CONSUMABLE_FIELDS, build: consumableData },
      input,
    );
    return data && { kind: ContentKind.Consumable, data };
  },
  [ContentKind.Equipment]: (input) => {
    const container = input.document.type === FoundryItemType.Backpack;
    const data = parsedWith(
      container
        ? { schema: EquipmentData, fields: BACKPACK_FIELDS, build: backpackData }
        : { schema: EquipmentData, fields: EQUIPMENT_FIELDS, build: equipmentData },
      input,
    );
    return data && { kind: ContentKind.Equipment, data };
  },
  [ContentKind.Rune]: (input) => {
    const data = parsedWith({ schema: RuneData, fields: RUNE_FIELDS, build: runeData }, input);
    return data && { kind: ContentKind.Rune, data };
  },
  [ContentKind.Shield]: (input) => {
    const data = parsedWith({ schema: ShieldData, fields: SHIELD_FIELDS, build: shieldData }, input);
    return data && { kind: ContentKind.Shield, data };
  },
  [ContentKind.Treasure]: (input) => {
    const data = parsedWith({ schema: TreasureData, fields: TREASURE_FIELDS, build: treasureData }, input);
    return data && { kind: ContentKind.Treasure, data };
  },
  [ContentKind.Weapon]: (input) => {
    const data = parsedWith({ schema: WeaponData, fields: WEAPON_FIELDS, build: weaponData }, input);
    return data && { kind: ContentKind.Weapon, data };
  },
};

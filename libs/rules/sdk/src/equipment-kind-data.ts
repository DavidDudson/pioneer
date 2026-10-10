import { ArmorData, ShieldData } from './armor';
import { ConsumableData } from './consumable';
import { ContentKind } from './content-kind';
import { EquipmentData, KitData, TreasureData } from './equipment';
import { RuneData } from './rune';
import { WeaponData } from './weapon';

/** The `data` schemas of the equipment kinds, which `KIND_DATA` (`kind-data.ts`) takes in. */
export const EQUIPMENT_KIND_DATA = {
  [ContentKind.Armor]: ArmorData,
  [ContentKind.Consumable]: ConsumableData,
  [ContentKind.Equipment]: EquipmentData,
  [ContentKind.Kit]: KitData,
  [ContentKind.Rune]: RuneData,
  [ContentKind.Shield]: ShieldData,
  [ContentKind.Treasure]: TreasureData,
  [ContentKind.Weapon]: WeaponData,
} as const;

import { ArmorItemCategory } from './armor';
import type { ContentEntry } from './content-entry';
import { ContentKind } from './content-kind';
import {
  EquipmentKind,
  isEquipment,
  isMagical,
  itemBulk,
  itemPrice,
  itemUsage,
  TENTHS_PER_BULK,
  UsageValue,
} from './equipment-facet-values';
import type { EquipmentEntry } from './equipment-facet-values';
import { facetLabels, FacetId, FacetLabel, FacetType, RangeScale } from './facet';
import type { FacetDefinition, FacetDerive } from './facet';
import { DAMAGE_TYPE_FACET } from './spell-facets';
import { WeaponGroup } from './weapon';

/** A facet that reads items only: entries of other kinds give it no value. */
function ofItems(read: (entry: EquipmentEntry) => readonly unknown[]): FacetDerive {
  return (entry: ContentEntry): readonly unknown[] => (isEquipment(entry) ? read(entry) : []);
}

const EquipmentFacetMessage = {
  ItemKind: FacetLabel.parse('rules.facet.label.itemKind'),
  Price: FacetLabel.parse('rules.facet.label.price'),
  Bulk: FacetLabel.parse('rules.facet.label.bulk'),
  Usage: FacetLabel.parse('rules.facet.label.usage'),
  Consumable: FacetLabel.parse('rules.facet.label.consumable'),
  Magical: FacetLabel.parse('rules.facet.label.magical'),
  WeaponGroup: FacetLabel.parse('rules.facet.label.weaponGroup'),
  ArmorCategory: FacetLabel.parse('rules.facet.label.armorCategory'),
} as const;

const ITEM_KIND_LABELS = facetLabels({
  [EquipmentKind.Weapon]: 'rules.facet.itemKind.weapon',
  [EquipmentKind.Armor]: 'rules.facet.itemKind.armor',
  [EquipmentKind.Shield]: 'rules.facet.itemKind.shield',
  [EquipmentKind.Equipment]: 'rules.facet.itemKind.equipment',
  [EquipmentKind.Consumable]: 'rules.facet.itemKind.consumable',
  [EquipmentKind.Rune]: 'rules.facet.itemKind.rune',
  [EquipmentKind.Treasure]: 'rules.facet.itemKind.treasure',
  [EquipmentKind.Kit]: 'rules.facet.itemKind.kit',
});

const USAGE_LABELS = facetLabels({
  [UsageValue.Held]: 'rules.facet.usage.held',
  [UsageValue.Worn]: 'rules.facet.usage.worn',
  [UsageValue.Etched]: 'rules.facet.usage.etched',
  [UsageValue.Affixed]: 'rules.facet.usage.affixed',
  [UsageValue.Attached]: 'rules.facet.usage.attached',
  [UsageValue.Applied]: 'rules.facet.usage.applied',
  [UsageValue.Installed]: 'rules.facet.usage.installed',
  [UsageValue.Tattooed]: 'rules.facet.usage.tattooed',
  [UsageValue.Implanted]: 'rules.facet.usage.implanted',
  [UsageValue.Carried]: 'rules.facet.usage.carried',
  [UsageValue.Other]: 'rules.facet.usage.other',
});

const WEAPON_GROUP_LABELS = facetLabels({
  [WeaponGroup.Axe]: 'rules.facet.weaponGroup.axe',
  [WeaponGroup.Bomb]: 'rules.facet.weaponGroup.bomb',
  [WeaponGroup.Bow]: 'rules.facet.weaponGroup.bow',
  [WeaponGroup.Brawling]: 'rules.facet.weaponGroup.brawling',
  [WeaponGroup.Club]: 'rules.facet.weaponGroup.club',
  [WeaponGroup.Crossbow]: 'rules.facet.weaponGroup.crossbow',
  [WeaponGroup.Dart]: 'rules.facet.weaponGroup.dart',
  [WeaponGroup.Firearm]: 'rules.facet.weaponGroup.firearm',
  [WeaponGroup.Flail]: 'rules.facet.weaponGroup.flail',
  [WeaponGroup.Hammer]: 'rules.facet.weaponGroup.hammer',
  [WeaponGroup.Knife]: 'rules.facet.weaponGroup.knife',
  [WeaponGroup.Pick]: 'rules.facet.weaponGroup.pick',
  [WeaponGroup.Polearm]: 'rules.facet.weaponGroup.polearm',
  [WeaponGroup.Shield]: 'rules.facet.weaponGroup.shield',
  [WeaponGroup.Sling]: 'rules.facet.weaponGroup.sling',
  [WeaponGroup.Spear]: 'rules.facet.weaponGroup.spear',
  [WeaponGroup.Sword]: 'rules.facet.weaponGroup.sword',
});

const ARMOR_CATEGORY_LABELS = facetLabels({
  [ArmorItemCategory.Unarmored]: 'rules.facet.armorCategory.unarmored',
  [ArmorItemCategory.Light]: 'rules.facet.armorCategory.light',
  [ArmorItemCategory.Medium]: 'rules.facet.armorCategory.medium',
  [ArmorItemCategory.Heavy]: 'rules.facet.armorCategory.heavy',
  [ArmorItemCategory.LightBarding]: 'rules.facet.armorCategory.lightBarding',
  [ArmorItemCategory.HeavyBarding]: 'rules.facet.armorCategory.heavyBarding',
});

/**
 * The equipment facets (content-model.md, "Filters"), beyond the common ones: one set for every equipment kind, so
 * a mixed list filters alike. Price compares in copper; bulk counts tenths, so light and negligible sit below 1.
 */
export const EQUIPMENT_FACETS: readonly FacetDefinition[] = [
  {
    id: FacetId.parse('item-kind'),
    type: FacetType.Set,
    label: EquipmentFacetMessage.ItemKind,
    values: ITEM_KIND_LABELS,
    derive: ofItems(({ kind }) => [kind]),
  },
  {
    id: FacetId.parse('price'),
    type: FacetType.Range,
    label: EquipmentFacetMessage.Price,
    derive: ofItems((entry) => [itemPrice(entry)]),
  },
  {
    id: FacetId.parse('bulk'),
    type: FacetType.Range,
    label: EquipmentFacetMessage.Bulk,
    scale: RangeScale.parse(TENTHS_PER_BULK),
    derive: ofItems((entry) => [itemBulk(entry)]),
  },
  {
    id: FacetId.parse('usage'),
    type: FacetType.Set,
    label: EquipmentFacetMessage.Usage,
    values: USAGE_LABELS,
    derive: ofItems((entry) => itemUsage(entry)),
  },
  {
    id: FacetId.parse('consumable'),
    type: FacetType.Flag,
    label: EquipmentFacetMessage.Consumable,
    derive: ofItems(({ kind }) => [kind === ContentKind.Consumable]),
  },
  {
    id: FacetId.parse('magical'),
    type: FacetType.Flag,
    label: EquipmentFacetMessage.Magical,
    derive: ofItems((entry) => [isMagical(entry)]),
  },
  {
    id: FacetId.parse('weapon-group'),
    type: FacetType.Set,
    label: EquipmentFacetMessage.WeaponGroup,
    values: WEAPON_GROUP_LABELS,
    appliesTo: [ContentKind.Weapon],
    derive: ofItems((entry) => (entry.kind === ContentKind.Weapon ? [entry.data.group] : [])),
  },
  DAMAGE_TYPE_FACET,
  {
    id: FacetId.parse('armor-category'),
    type: FacetType.Set,
    label: EquipmentFacetMessage.ArmorCategory,
    values: ARMOR_CATEGORY_LABELS,
    appliesTo: [ContentKind.Armor],
    derive: ofItems((entry) => (entry.kind === ContentKind.Armor ? [entry.data.category] : [])),
  },
];

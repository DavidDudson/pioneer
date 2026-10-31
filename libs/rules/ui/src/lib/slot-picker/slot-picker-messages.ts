import { Rarity } from '@pioneer/rules/sdk';

/** Message keys the slot, skill and language pickers render with, spelled out so the key check sees them. */
export const SlotPickerMessage = {
  Name: 'rules.slotPicker.column.name',
  Source: 'rules.slotPicker.column.source',
  Level: 'rules.slotPicker.column.level',
  Traits: 'rules.slotPicker.column.traits',
  Summary: 'rules.slotPicker.column.summary',
  Attribute: 'rules.slotPicker.column.attribute',
  Rank: 'rules.slotPicker.column.rank',
  Modifier: 'rules.slotPicker.column.modifier',
  Boosted: 'rules.slotPicker.column.boosted',
  ArmorPenalty: 'rules.slotPicker.column.armorPenalty',
  Rarity: 'rules.slotPicker.column.rarity',
  Script: 'rules.slotPicker.column.script',
  Known: 'rules.slotPicker.column.known',
  KnownYes: 'rules.slotPicker.knownYes',
  KnownNo: 'rules.slotPicker.knownNo',
  AddLore: 'rules.slotPicker.addLore',
} as const;

/** A rarity's name, spelled out so the key check sees it. */
export const SLOT_RARITY_MESSAGES = {
  [Rarity.Common]: 'rules.slotPicker.rarity.common',
  [Rarity.Uncommon]: 'rules.slotPicker.rarity.uncommon',
  [Rarity.Rare]: 'rules.slotPicker.rarity.rare',
  [Rarity.Unique]: 'rules.slotPicker.rarity.unique',
} as const satisfies Readonly<Record<Rarity, string>>;

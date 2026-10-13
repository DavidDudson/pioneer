import { FeatCategory, Rarity } from '@pioneer/rules/sdk';

/** Message keys the feat picker renders with, spelled out so the key check sees them. */
export const FeatPickerMessage = {
  Name: 'rules.featPicker.column.name',
  Level: 'rules.featPicker.column.level',
  Category: 'rules.featPicker.column.category',
  Actions: 'rules.featPicker.column.actions',
  Traits: 'rules.featPicker.column.traits',
  Prerequisites: 'rules.featPicker.column.prerequisites',
  Source: 'rules.featPicker.column.source',
  Notes: 'rules.featPicker.column.notes',
} as const;

/** What each feat category is called. */
export const FEAT_CATEGORY_MESSAGES: Readonly<Record<FeatCategory, string>> = {
  [FeatCategory.Ancestry]: 'rules.featPicker.category.ancestry',
  [FeatCategory.Class]: 'rules.featPicker.category.class',
  [FeatCategory.General]: 'rules.featPicker.category.general',
  [FeatCategory.Skill]: 'rules.featPicker.category.skill',
  [FeatCategory.Bonus]: 'rules.featPicker.category.bonus',
};

/** What each rarity above common is called, shown as a chip before the traits. */
export const FEAT_RARITY_MESSAGES: Readonly<Record<Exclude<Rarity, typeof Rarity.Common>, string>> = {
  [Rarity.Uncommon]: 'rules.featPicker.rarity.uncommon',
  [Rarity.Rare]: 'rules.featPicker.rarity.rare',
  [Rarity.Unique]: 'rules.featPicker.rarity.unique',
};

import { ContentKind, Rarity } from '@pioneer/rules/sdk';

/** The message key of each kind's name, spelled out in full so the key check sees them. */
export const KIND_MESSAGES: Readonly<Record<ContentKind, string>> = {
  [ContentKind.Action]: 'homebrew.entry.kind.action',
  [ContentKind.Ancestry]: 'homebrew.entry.kind.ancestry',
  [ContentKind.AncestryFeature]: 'homebrew.entry.kind.ancestryFeature',
  [ContentKind.Archetype]: 'homebrew.entry.kind.archetype',
  [ContentKind.Armor]: 'homebrew.entry.kind.armor',
  [ContentKind.Background]: 'homebrew.entry.kind.background',
  [ContentKind.Class]: 'homebrew.entry.kind.class',
  [ContentKind.ClassFeature]: 'homebrew.entry.kind.classFeature',
  [ContentKind.CompanionSpecies]: 'homebrew.entry.kind.companionSpecies',
  [ContentKind.Condition]: 'homebrew.entry.kind.condition',
  [ContentKind.Consumable]: 'homebrew.entry.kind.consumable',
  [ContentKind.Creature]: 'homebrew.entry.kind.creature',
  [ContentKind.DamageType]: 'homebrew.entry.kind.damageType',
  [ContentKind.Deity]: 'homebrew.entry.kind.deity',
  [ContentKind.Effect]: 'homebrew.entry.kind.effect',
  [ContentKind.Environment]: 'homebrew.entry.kind.environment',
  [ContentKind.Equipment]: 'homebrew.entry.kind.equipment',
  [ContentKind.Feat]: 'homebrew.entry.kind.feat',
  [ContentKind.Heritage]: 'homebrew.entry.kind.heritage',
  [ContentKind.Kit]: 'homebrew.entry.kind.kit',
  [ContentKind.Language]: 'homebrew.entry.kind.language',
  [ContentKind.Ritual]: 'homebrew.entry.kind.ritual',
  [ContentKind.Rune]: 'homebrew.entry.kind.rune',
  [ContentKind.Sense]: 'homebrew.entry.kind.sense',
  [ContentKind.Shield]: 'homebrew.entry.kind.shield',
  [ContentKind.Spell]: 'homebrew.entry.kind.spell',
  [ContentKind.SpellcastingTradition]: 'homebrew.entry.kind.spellcastingTradition',
  [ContentKind.Statistic]: 'homebrew.entry.kind.statistic',
  [ContentKind.Trait]: 'homebrew.entry.kind.trait',
  [ContentKind.Treasure]: 'homebrew.entry.kind.treasure',
  [ContentKind.VariantRule]: 'homebrew.entry.kind.variantRule',
  [ContentKind.Weapon]: 'homebrew.entry.kind.weapon',
};

/** The message key of each rarity's name. */
export const RARITY_MESSAGES: Readonly<Record<Rarity, string>> = {
  [Rarity.Common]: 'homebrew.entry.rarity.common',
  [Rarity.Uncommon]: 'homebrew.entry.rarity.uncommon',
  [Rarity.Rare]: 'homebrew.entry.rarity.rare',
  [Rarity.Unique]: 'homebrew.entry.rarity.unique',
};

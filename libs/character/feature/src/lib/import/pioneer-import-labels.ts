import { HomebrewEntryOutcome, HomebrewPackStatus } from '@pioneer/interop/pioneer';
import { ContentKind } from '@pioneer/rules/sdk';

/** Label key per kind of content a Pioneer file can name that no loaded pack has. */
export const CONTENT_KIND_KEYS: Readonly<Record<ContentKind, string>> = {
  [ContentKind.Action]: 'character.import.pioneer.kind.action',
  [ContentKind.Ancestry]: 'character.import.pioneer.kind.ancestry',
  [ContentKind.AncestryFeature]: 'character.import.pioneer.kind.ancestryFeature',
  [ContentKind.Archetype]: 'character.import.pioneer.kind.archetype',
  [ContentKind.Armor]: 'character.import.pioneer.kind.armor',
  [ContentKind.Background]: 'character.import.pioneer.kind.background',
  [ContentKind.Class]: 'character.import.pioneer.kind.class',
  [ContentKind.ClassFeature]: 'character.import.pioneer.kind.classFeature',
  [ContentKind.Condition]: 'character.import.pioneer.kind.condition',
  [ContentKind.Consumable]: 'character.import.pioneer.kind.consumable',
  [ContentKind.Creature]: 'character.import.pioneer.kind.creature',
  [ContentKind.DamageType]: 'character.import.pioneer.kind.damageType',
  [ContentKind.Deity]: 'character.import.pioneer.kind.deity',
  [ContentKind.Effect]: 'character.import.pioneer.kind.effect',
  [ContentKind.Environment]: 'character.import.pioneer.kind.environment',
  [ContentKind.Equipment]: 'character.import.pioneer.kind.equipment',
  [ContentKind.Feat]: 'character.import.pioneer.kind.feat',
  [ContentKind.Heritage]: 'character.import.pioneer.kind.heritage',
  [ContentKind.Kit]: 'character.import.pioneer.kind.kit',
  [ContentKind.Language]: 'character.import.pioneer.kind.language',
  [ContentKind.Ritual]: 'character.import.pioneer.kind.ritual',
  [ContentKind.Rune]: 'character.import.pioneer.kind.rune',
  [ContentKind.Sense]: 'character.import.pioneer.kind.sense',
  [ContentKind.Shield]: 'character.import.pioneer.kind.shield',
  [ContentKind.Spell]: 'character.import.pioneer.kind.spell',
  [ContentKind.SpellcastingTradition]: 'character.import.pioneer.kind.spellcastingTradition',
  [ContentKind.Statistic]: 'character.import.pioneer.kind.statistic',
  [ContentKind.Trait]: 'character.import.pioneer.kind.trait',
  [ContentKind.Treasure]: 'character.import.pioneer.kind.treasure',
  [ContentKind.VariantRule]: 'character.import.pioneer.kind.variantRule',
  [ContentKind.Weapon]: 'character.import.pioneer.kind.weapon',
};

/** What importing does with a homebrew pack in the file, by who holds the pack id on this server. */
export const HOMEBREW_STATUS_KEYS: Readonly<Record<HomebrewPackStatus, string>> = {
  [HomebrewPackStatus.New]: 'character.import.pioneer.homebrew.status.new',
  [HomebrewPackStatus.Own]: 'character.import.pioneer.homebrew.status.own',
  [HomebrewPackStatus.Taken]: 'character.import.pioneer.homebrew.status.taken',
};

/** What importing does with one homebrew entry in the file. */
export const HOMEBREW_OUTCOME_KEYS: Readonly<Record<HomebrewEntryOutcome, string>> = {
  [HomebrewEntryOutcome.Create]: 'character.import.pioneer.homebrew.outcome.create',
  [HomebrewEntryOutcome.Reuse]: 'character.import.pioneer.homebrew.outcome.reuse',
  [HomebrewEntryOutcome.Clash]: 'character.import.pioneer.homebrew.outcome.clash',
};

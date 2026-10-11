import { ContentKind, SenseAcuity } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { FoundryLang } from './foundry-release';

/**
 * The vocabularies Foundry pf2e keeps in code rather than in packs: its trait lists, languages, senses and damage
 * types. They live in TypeScript modules of the system source, which the CLI loads from the pinned archive
 * (`CONFIG_MODULES`) and hands in as module namespaces; this module only checks and reshapes their exports.
 */

/** The archive's config modules, below its top-level directory, keyed by what they hold. */
export const CONFIG_MODULES = {
  traits: 'src/scripts/config/traits.ts',
  creature: 'src/module/actor/creature/values.ts',
  damage: 'src/module/system/damage/values.ts',
} as const;
export type ConfigModule = keyof typeof CONFIG_MODULES;

/** Each config module's exports, as the CLI imported them. */
export type ConfigModules = Readonly<Record<ConfigModule, unknown>>;

/** Foundry's trait lists that an item type validates its traits against, by export name. */
export const TraitList = {
  Action: 'actionTraits',
  Armor: 'armorTraits',
  Class: 'classTraits',
  Consumable: 'consumableTraits',
  Creature: 'creatureTraits',
  Effect: 'effectTraits',
  Equipment: 'equipmentTraits',
  Feat: 'featTraits',
  Shield: 'shieldTraits',
  Spell: 'spellTraits',
  Weapon: 'weaponTraits',
} as const;
export type TraitList = ValueOf<typeof TraitList>;

/**
 * The Pioneer kinds whose entries carry the traits of each list, after the Foundry item types that validate against
 * it (`validTraits`): ancestries and heritages take creature traits, conditions effect traits, rituals spell traits, kits class traits.
 * Treasure validates against none.
 * A trait's `appliesTo` is the union over the lists it sits in.
 */
export const TRAIT_LIST_KINDS: Readonly<Record<TraitList, readonly ContentKind[]>> = {
  [TraitList.Action]: [ContentKind.Action],
  [TraitList.Armor]: [ContentKind.Armor],
  [TraitList.Class]: [ContentKind.Kit],
  [TraitList.Consumable]: [ContentKind.Consumable],
  [TraitList.Creature]: [ContentKind.Ancestry, ContentKind.Heritage, ContentKind.Creature],
  [TraitList.Effect]: [ContentKind.Effect, ContentKind.Condition],
  [TraitList.Equipment]: [ContentKind.Equipment],
  [TraitList.Feat]: [ContentKind.Feat, ContentKind.ClassFeature],
  [TraitList.Shield]: [ContentKind.Shield],
  [TraitList.Spell]: [ContentKind.Spell, ContentKind.Ritual],
  [TraitList.Weapon]: [ContentKind.Weapon],
};

/** Foundry's language rarities; `secret` languages (Wildsong) have no rarity Pioneer can carry. */
export const FoundryLanguageRarity = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Secret: 'secret',
} as const;
export type FoundryLanguageRarity = ValueOf<typeof FoundryLanguageRarity>;

/** Foundry's one language outside its rarity table: everyone's shared tongue. */
const COMMON_LANGUAGE = 'common';
const SLUG_MAX = 64;
const LABEL_MAX = 200;
const VOCABULARY_MAX = 2000;

const Key = z.string().min(1).max(SLUG_MAX);
/** Slug to the lang key of its label (`manipulate: "PF2E.TraitManipulate"`). */
const LabelTable = z.record(Key, z.string().max(LABEL_MAX));
const Keys = z.array(Key).max(VOCABULARY_MAX).readonly();
const KeySet = z.set(Key).max(VOCABULARY_MAX);

const TraitsModule = z.looseObject({
  [TraitList.Action]: LabelTable,
  [TraitList.Armor]: LabelTable,
  [TraitList.Class]: LabelTable,
  [TraitList.Consumable]: LabelTable,
  [TraitList.Creature]: LabelTable,
  [TraitList.Effect]: LabelTable,
  [TraitList.Equipment]: LabelTable,
  [TraitList.Feat]: LabelTable,
  [TraitList.Shield]: LabelTable,
  [TraitList.Spell]: LabelTable,
  [TraitList.Weapon]: LabelTable,
});

const CreatureModule = z.looseObject({
  LANGUAGES_BY_RARITY: z.looseObject({
    pf2e: z.strictObject({ common: Keys, uncommon: Keys, rare: Keys, secret: Keys }),
  }),
  SENSE_TYPES: KeySet,
  SENSES_WITH_MANDATORY_ACUITIES: z.record(Key, z.enum(SenseAcuity)),
  SENSES_WITH_UNLIMITED_RANGE: Keys,
});

const DamageModule = z.looseObject({ DAMAGE_TYPES: KeySet });

export interface FoundrySense {
  readonly acuity?: SenseAcuity;
  readonly unlimitedRange: boolean;
}

export interface FoundryConfig {
  /** Each trait list, slug to label key. */
  readonly traitLists: ReadonlyMap<TraitList, ReadonlyMap<string, string>>;
  readonly languages: ReadonlyMap<string, FoundryLanguageRarity>;
  readonly senses: ReadonlyMap<string, FoundrySense>;
  readonly damageTypes: readonly string[];
}

function languagesOf(
  byRarity: Readonly<Record<FoundryLanguageRarity, readonly string[]>>,
): Map<string, FoundryLanguageRarity> {
  const languages = new Map<string, FoundryLanguageRarity>([[COMMON_LANGUAGE, FoundryLanguageRarity.Common]]);
  for (const rarity of Object.values(FoundryLanguageRarity)) {
    for (const language of byRarity[rarity]) {
      languages.set(language, rarity);
    }
  }
  return languages;
}

/** The vocabularies out of the config modules' exports; throws, naming the export, when Foundry reshaped one. */
export function foundryConfig(modules: ConfigModules): FoundryConfig {
  const traits = TraitsModule.parse(modules.traits);
  const creature = CreatureModule.parse(modules.creature);
  const damage = DamageModule.parse(modules.damage);
  const unlimited = new Set(creature.SENSES_WITH_UNLIMITED_RANGE);
  const acuities = creature.SENSES_WITH_MANDATORY_ACUITIES;
  return {
    traitLists: new Map(Object.values(TraitList).map((list) => [list, new Map(Object.entries(traits[list]))])),
    languages: languagesOf(creature.LANGUAGES_BY_RARITY.pf2e),
    senses: new Map(
      [...creature.SENSE_TYPES].map((sense) => {
        const acuity = acuities[sense];
        return [sense, { ...(acuity === undefined ? {} : { acuity }), unlimitedRange: unlimited.has(sense) }];
      }),
    ),
    damageTypes: [...damage.DAMAGE_TYPES],
  };
}

/** The text of a lang key (`PF2E.TraitManipulate`), or undefined when the table has no string there. */
export function langLabel(lang: FoundryLang, key: string): string | undefined {
  let node: unknown = lang;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, part)) {
      return undefined;
    }
    node = Object.getOwnPropertyDescriptor(node, part)?.value;
  }
  return typeof node === 'string' ? node : undefined;
}

/** Foundry's "bactrian" camel case for label keys: `low-light-vision` to `LowLightVision`. */
export function bactrian(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

import { ActionData } from './action';
import { AncestryData } from './ancestry';
import { ArchetypeData } from './archetype';
import { BackgroundData } from './background';
import { ClassData } from './character-class';
import { ConditionData } from './condition';
import { ContentKind } from './content-kind';
import { CreatureData } from './creature';
import { DamageTypeData } from './damage';
import { DeityData } from './deity';
import { EffectData } from './effect';
import { EQUIPMENT_KIND_DATA } from './equipment-kind-data';
import { ClassFeatureData, FeatData } from './feat';
import { HeritageData } from './heritage';
import { LanguageData } from './language';
import { MAGIC_KIND_DATA } from './magic-kind-data';
import { SenseData } from './sense';
import { StatisticData } from './statistic';
import { TraitData } from './trait';
import { VariantRuleData } from './variant-rule';

/**
 * The `data` schema for each kind that has one. A kind joins here with its schema module and an arm of `Entry`
 * (`content-entry.ts`, or `equipment-entries.ts` for the equipment kinds); the rest of `ContentKind` is rejected
 * until it does. The magic kinds come in from `magic-kind-data.ts`, the equipment kinds from
 * `equipment-kind-data.ts`.
 */
export const KIND_DATA = {
  [ContentKind.Action]: ActionData,
  [ContentKind.Ancestry]: AncestryData,
  [ContentKind.Archetype]: ArchetypeData,
  [ContentKind.Background]: BackgroundData,
  [ContentKind.Class]: ClassData,
  [ContentKind.ClassFeature]: ClassFeatureData,
  [ContentKind.Condition]: ConditionData,
  [ContentKind.Creature]: CreatureData,
  [ContentKind.DamageType]: DamageTypeData,
  [ContentKind.Deity]: DeityData,
  [ContentKind.Effect]: EffectData,
  [ContentKind.Feat]: FeatData,
  [ContentKind.Heritage]: HeritageData,
  [ContentKind.Language]: LanguageData,
  [ContentKind.Sense]: SenseData,
  [ContentKind.Statistic]: StatisticData,
  [ContentKind.Trait]: TraitData,
  [ContentKind.VariantRule]: VariantRuleData,
  ...MAGIC_KIND_DATA,
  ...EQUIPMENT_KIND_DATA,
} as const;
export type RegisteredKind = keyof typeof KIND_DATA;

/** Every kind with a `data` schema, in `ContentKind` order. */
export const REGISTERED_KINDS: readonly RegisteredKind[] = Object.values(ContentKind).filter(
  (kind): kind is RegisteredKind => Object.hasOwn(KIND_DATA, kind),
);

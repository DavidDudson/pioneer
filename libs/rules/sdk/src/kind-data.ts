import { ActionData } from './action';
import { AncestryData } from './ancestry';
import { ConditionData } from './condition';
import { ContentKind } from './content-kind';
import { CreatureData } from './creature';
import { DamageTypeData } from './damage';
import { LanguageData } from './language';
import { SenseData } from './sense';
import { StatisticData } from './statistic';
import { TraitData } from './trait';
import { VariantRuleData } from './variant-rule';

/**
 * The `data` schema for each kind that has one. A kind joins here with its schema module and an arm of `Entry`
 * (`content-entry.ts`); the rest of `ContentKind` is rejected until it does.
 */
export const KIND_DATA = {
  [ContentKind.Action]: ActionData,
  [ContentKind.Ancestry]: AncestryData,
  [ContentKind.Condition]: ConditionData,
  [ContentKind.Creature]: CreatureData,
  [ContentKind.DamageType]: DamageTypeData,
  [ContentKind.Language]: LanguageData,
  [ContentKind.Sense]: SenseData,
  [ContentKind.Statistic]: StatisticData,
  [ContentKind.Trait]: TraitData,
  [ContentKind.VariantRule]: VariantRuleData,
} as const;
export type RegisteredKind = keyof typeof KIND_DATA;

/** Every kind with a `data` schema, in `ContentKind` order. */
export const REGISTERED_KINDS: readonly RegisteredKind[] = Object.values(ContentKind).filter(
  (kind): kind is RegisteredKind => Object.hasOwn(KIND_DATA, kind),
);

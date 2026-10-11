import {
  ActionData,
  ConditionData,
  ContentKind,
  EffectData,
  KIND_DATA,
  RitualData,
  SpellData,
} from '@pioneer/rules/sdk';
import type {
  ContentId,
  DamageTypeData,
  LanguageData,
  RuleElement,
  SenseData,
  StatisticData,
  TraitData,
} from '@pioneer/rules/sdk';
import type * as z from 'zod';

import type { EntryReferences } from './entry-references';
import { documentKind } from './entry-slugs';
import { EQUIPMENT_TRANSLATORS } from './equipment-kind-data';
import type { EquipmentKindData } from './equipment-kind-data';
import type { ImportedEnvelope } from './imported-envelope';
import { parsedWith } from './kind-data-gaps';
import type { GapLog, KindDataGap, KindInput } from './kind-data-gaps';
import type { SelectedEntry } from './select-entries';
import { ACTION_FIELDS, actionData } from './translate-action';
import { ANCESTRY_FIELDS, ancestryData, HERITAGE_FIELDS, heritageData } from './translate-ancestry';
import type { ArchetypeLink } from './translate-archetype';
import { BACKGROUND_FIELDS, backgroundData } from './translate-background';
import { CLASS_FIELDS, classData } from './translate-class';
import { CONDITION_FIELDS, conditionData } from './translate-condition';
import { DEITY_FIELDS, deityData } from './translate-deity';
import { EFFECT_FIELDS, effectData } from './translate-effect';
import { classFeatureData, FEAT_FIELDS, featData } from './translate-feat';
import { KIT_FIELDS, kitData } from './translate-kit';
import { RITUAL_FIELDS, ritualData, SPELL_FIELDS, spellData } from './translate-spell';
import type { FoundrySenses } from './translate-senses';

/**
 * Kind `data` for the kinds the packs hold, from their Foundry `system` fields (content-model.md, "Rules core data",
 * "Build data" and "Magic and play data"). A field with no place in the schema, a value with no mapping, and a reference that resolves to
 * nothing are reported against the entry, never guessed; the entry keeps what did translate. Data the schema rejects
 * as a whole is reported and the entry has none. Some kinds also add rule elements Foundry keeps as fields (a
 * class's starting proficiencies, the features it grants by level).
 */

/** The `data` of a build kind, which the SDK exports through `KIND_DATA` alone. */
type DataOf<Kind extends keyof typeof KIND_DATA> = z.infer<(typeof KIND_DATA)[Kind]>;

export type ImportedKindData =
  | { readonly kind: typeof ContentKind.Action; readonly data: ActionData }
  | { readonly kind: typeof ContentKind.Ancestry; readonly data: DataOf<typeof ContentKind.Ancestry> }
  | { readonly kind: typeof ContentKind.Archetype; readonly data: DataOf<typeof ContentKind.Archetype> }
  | { readonly kind: typeof ContentKind.Background; readonly data: DataOf<typeof ContentKind.Background> }
  | { readonly kind: typeof ContentKind.Class; readonly data: DataOf<typeof ContentKind.Class> }
  | { readonly kind: typeof ContentKind.ClassFeature; readonly data: DataOf<typeof ContentKind.ClassFeature> }
  | { readonly kind: typeof ContentKind.Condition; readonly data: ConditionData }
  | { readonly kind: typeof ContentKind.DamageType; readonly data: DamageTypeData }
  | { readonly kind: typeof ContentKind.Deity; readonly data: DataOf<typeof ContentKind.Deity> }
  | { readonly kind: typeof ContentKind.Effect; readonly data: EffectData }
  | { readonly kind: typeof ContentKind.Feat; readonly data: DataOf<typeof ContentKind.Feat> }
  | { readonly kind: typeof ContentKind.Heritage; readonly data: DataOf<typeof ContentKind.Heritage> }
  | { readonly kind: typeof ContentKind.Kit; readonly data: DataOf<typeof ContentKind.Kit> }
  | { readonly kind: typeof ContentKind.Language; readonly data: LanguageData }
  | { readonly kind: typeof ContentKind.Ritual; readonly data: RitualData }
  | { readonly kind: typeof ContentKind.Sense; readonly data: SenseData }
  | { readonly kind: typeof ContentKind.Spell; readonly data: SpellData }
  | { readonly kind: typeof ContentKind.Statistic; readonly data: StatisticData }
  | { readonly kind: typeof ContentKind.Trait; readonly data: TraitData }
  | EquipmentKindData;

export interface KindDataTranslation {
  readonly kindData?: ImportedKindData;
  /** Rule elements the kind's fields add to the entry's own, already parsed. */
  readonly rules: readonly RuleElement[];
  readonly gaps: readonly KindDataGap[];
}

/** What a kind translator makes of a document: its kind data, when it has any. */
type KindTranslator = (input: KindInput) => ImportedKindData | undefined;

const TRANSLATORS: Readonly<Partial<Record<ContentKind, KindTranslator>>> = {
  ...EQUIPMENT_TRANSLATORS,
  [ContentKind.Action]: (input) => {
    const data = parsedWith({ schema: ActionData, fields: ACTION_FIELDS, build: actionData }, input);
    return data && { kind: ContentKind.Action, data };
  },
  [ContentKind.Ancestry]: (input) => {
    const data = parsedWith(
      { schema: KIND_DATA[ContentKind.Ancestry], fields: ANCESTRY_FIELDS, build: ancestryData },
      input,
    );
    return data && { kind: ContentKind.Ancestry, data };
  },
  [ContentKind.Background]: (input) => {
    const data = parsedWith(
      { schema: KIND_DATA[ContentKind.Background], fields: BACKGROUND_FIELDS, build: backgroundData },
      input,
    );
    return data && { kind: ContentKind.Background, data };
  },
  [ContentKind.Class]: (input) => {
    const data = parsedWith({ schema: KIND_DATA[ContentKind.Class], fields: CLASS_FIELDS, build: classData }, input);
    return data && { kind: ContentKind.Class, data };
  },
  [ContentKind.ClassFeature]: (input) => {
    const data = parsedWith(
      { schema: KIND_DATA[ContentKind.ClassFeature], fields: FEAT_FIELDS, build: classFeatureData },
      input,
    );
    return data && { kind: ContentKind.ClassFeature, data };
  },
  [ContentKind.Condition]: (input) => {
    const data = parsedWith({ schema: ConditionData, fields: CONDITION_FIELDS, build: conditionData }, input);
    return data && { kind: ContentKind.Condition, data };
  },
  [ContentKind.Deity]: (input) => {
    const data = parsedWith({ schema: KIND_DATA[ContentKind.Deity], fields: DEITY_FIELDS, build: deityData }, input);
    return data && { kind: ContentKind.Deity, data };
  },
  [ContentKind.Effect]: (input) => {
    const data = parsedWith({ schema: EffectData, fields: EFFECT_FIELDS, build: effectData }, input);
    return data && { kind: ContentKind.Effect, data };
  },
  [ContentKind.Feat]: (input) => {
    const data = parsedWith({ schema: KIND_DATA[ContentKind.Feat], fields: FEAT_FIELDS, build: featData }, input);
    return data && { kind: ContentKind.Feat, data };
  },
  [ContentKind.Heritage]: (input) => {
    const data = parsedWith(
      { schema: KIND_DATA[ContentKind.Heritage], fields: HERITAGE_FIELDS, build: heritageData },
      input,
    );
    return data && { kind: ContentKind.Heritage, data };
  },
  [ContentKind.Kit]: (input) => {
    const data = parsedWith({ schema: KIND_DATA[ContentKind.Kit], fields: KIT_FIELDS, build: kitData }, input);
    return data && { kind: ContentKind.Kit, data };
  },
  [ContentKind.Ritual]: (input) => {
    const data = parsedWith({ schema: RitualData, fields: RITUAL_FIELDS, build: ritualData }, input);
    return data && { kind: ContentKind.Ritual, data };
  },
  [ContentKind.Spell]: (input) => {
    const data = parsedWith({ schema: SpellData, fields: SPELL_FIELDS, build: spellData }, input);
    return data && { kind: ContentKind.Spell, data };
  },
};

/** What a document's data may refer to: the import's references, and the archetypes linking each feat. */
export interface KindDataContext {
  readonly references: EntryReferences;
  readonly archetypes: ReadonlyMap<ContentId, readonly ArchetypeLink[]>;
  /** What each Foundry sense fixes, for the `Sense` elements a feat's `subfeatures` add. */
  readonly senses?: FoundrySenses;
}

/**
 * The kind data of a translated document, when its kind has a translator (`TRANSLATORS`), with the rule elements
 * its fields add and what it could not carry over. Every Foundry type's kind has one; a kind without one gets none.
 */
export function translateKindData(
  entry: SelectedEntry,
  envelope: ImportedEnvelope,
  { references, archetypes, senses }: KindDataContext,
): KindDataTranslation {
  const translator = TRANSLATORS[documentKind(entry)];
  if (translator === undefined) {
    return { rules: [], gaps: [] };
  }
  const log: GapLog = { entry: envelope.id, gaps: [] };
  const rules: RuleElement[] = [];
  const { document, pack } = entry;
  const input = { document, pack, envelope, references, log, rules, archetypes };
  const kindData = translator(senses === undefined ? input : { ...input, senses });
  return { ...(kindData === undefined ? {} : { kindData }), rules, gaps: log.gaps };
}

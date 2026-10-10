import {
  array,
  boolean,
  constant,
  constantFrom,
  integer,
  oneof,
  record,
  stringMatching,
  tuple,
  uniqueArray,
  uuid,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ActionCategory, FrequencyPeriod, UP_TO_MAX } from '../action';
import { Attribute, ATTRIBUTE_MODIFIER_MAX, ATTRIBUTE_MODIFIER_MIN } from '../attribute';
import { ConditionGroup } from '../condition';
import { contentId, PackId, Slug } from '../content-id';
import { ContentKind } from '../content-kind';
import { DisplayCategory, Rarity } from '../entry-fields';
import { FeatCategory, UNLIMITED } from '../feat';
import type { RegisteredKind } from '../kind-data';
import { ActionCost } from '../rich-text';
import { SenseAcuity } from '../sense';
import { StatisticKind } from '../statistic';
import { CONTENT_LEVEL_MAX, LEVEL_MAX, LEVEL_MIN } from '../units';
import { actorFormulaText, keyPathText, skillSelectorText } from './arbitraries';
import {
  ancestryData,
  archetypeData,
  backgroundData,
  classData,
  deityOrPhilosophyData,
  heritageData,
} from './build-kind-arbitraries';
import { EQUIPMENT_KIND_ARBITRARIES } from './equipment-kind-arbitraries';
import {
  contentIdJson,
  damageType,
  LIST_MAX,
  positive,
  size,
  SMALLINT_MAX,
  slugText,
  smallint,
  withOptional,
} from './json-arbitraries';
import { effectData, ritualData, spellcastingTraditionData, spellData } from './magic-kind-arbitraries';
import { richTextJson } from './rich-text-arbitraries';
import { ruleElementJson } from './rule-element-arbitraries';

const AON_ID_MAX = 99_999;

const contentText: Arbitrary<string> = stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/u);
const modifier: Arbitrary<number> = integer({ min: -SMALLINT_MAX, max: SMALLINT_MAX });
const aonUrl: Arbitrary<string> = integer({ min: 1, max: AON_ID_MAX }).map(
  (id) => `https://2e.aonprd.com/Feats.aspx?ID=${id}`,
);

const rarity: Arbitrary<string> = constantFrom(...Object.values(Rarity));
const displayCategory: Arbitrary<string> = constantFrom(...Object.values(DisplayCategory));
const statisticKind: Arbitrary<string> = constantFrom(...Object.values(StatisticKind));
const attribute: Arbitrary<string> = constantFrom(...Object.values(Attribute));

const attributeModifier: Arbitrary<number> = integer({ min: ATTRIBUTE_MODIFIER_MIN, max: ATTRIBUTE_MODIFIER_MAX });
const adjustments: Arbitrary<object[]> = array(record({ type: damageType, value: positive }), { maxLength: LIST_MAX });

const creatureData: Arbitrary<object> = record({
  size,
  perception: modifier,
  attributes: record({
    str: attributeModifier,
    dex: attributeModifier,
    con: attributeModifier,
    int: attributeModifier,
    wis: attributeModifier,
    cha: attributeModifier,
  }),
  armorClass: smallint,
  saves: record({ fortitude: modifier, reflex: modifier, will: modifier }),
  hitPoints: smallint,
  immunities: array(slugText, { maxLength: LIST_MAX }),
  weaknesses: adjustments,
  resistances: adjustments,
  speed: smallint,
});

const statisticData: Arbitrary<object> = withOptional(
  record({
    selector: keyPathText,
    domains: array(keyPathText, { maxLength: LIST_MAX }),
    base: actorFormulaText,
    kind: statisticKind,
  }),
  { keyAttribute: attribute },
);

const actionUse = {
  category: constantFrom(...Object.values(ActionCategory)),
  requirements: richTextJson,
  frequency: record({ max: positive, per: constantFrom(...Object.values(FrequencyPeriod)) }),
  selfEffect: contentIdJson,
};
const reaction: Arbitrary<object> = withOptional(
  record({ cost: constant(ActionCost.Reaction), trigger: richTextJson }),
  actionUse,
);
const otherCost: Arbitrary<string> = constantFrom(
  ...Object.values(ActionCost).filter((cost) => cost !== ActionCost.Reaction),
);
const COUNTED_COSTS = [ActionCost.One, ActionCost.Two, ActionCost.Three];
/** A variable cost: a glyph that counts actions, running to more of them. */
const variableCost: Arbitrary<object> = constantFrom(...COUNTED_COSTS).chain((cost) =>
  record({
    cost: constant(cost),
    upTo: integer({ min: COUNTED_COSTS.indexOf(cost) + 2, max: UP_TO_MAX }),
  }),
);
const skills: Arbitrary<string[]> = uniqueArray(skillSelectorText, { maxLength: LIST_MAX });
/** A reaction always has a trigger; anything else may. */
const actionData: Arbitrary<object> = oneof(
  reaction,
  withOptional(constant({}), { cost: otherCost, trigger: richTextJson, skills, ...actionUse }),
  withOptional(variableCost, { skills, ...actionUse }),
);

const featCategory: Arbitrary<string> = constantFrom(...Object.values(FeatCategory));
const featData: Arbitrary<object> = withOptional(record({ category: featCategory }), {
  prerequisites: richTextJson,
  onlyLevel1: boolean(),
  skills,
  archetype: contentIdJson,
  maxTakable: oneof(positive, constant(UNLIMITED)),
  action: actionData,
});
const classFeatureData: Arbitrary<object> = withOptional(constant({}), { action: actionData });

const conditionRefs: Arbitrary<string[]> = uniqueArray(contentIdJson, { maxLength: LIST_MAX });
const conditionData: Arbitrary<object> = withOptional(
  record({ valued: boolean(), overrides: conditionRefs, implies: conditionRefs }),
  { group: constantFrom(...Object.values(ConditionGroup)) },
);

const senseData: Arbitrary<object> = withOptional(constant({}), {
  acuity: constantFrom(...Object.values(SenseAcuity)),
  unlimitedRange: boolean(),
});

const contentKind: Arbitrary<string> = constantFrom(...Object.values(ContentKind));
const traitData: Arbitrary<object> = record({ appliesTo: uniqueArray(contentKind, { maxLength: LIST_MAX }) });

const emptyData: Arbitrary<object> = constant({});

/** A level from any kind but creatures, and a creature's level. */
const entryLevel: Arbitrary<number> = integer({ min: 0, max: CONTENT_LEVEL_MAX });
const creatureLevel: Arbitrary<number> = integer({ min: LEVEL_MIN, max: LEVEL_MAX });

/** Valid `data` for each registered kind, its level when the kind always has one, and whether it never has one. */
interface KindArbitrary {
  readonly data: Arbitrary<object>;
  readonly level?: Arbitrary<number>;
  readonly levelless?: boolean;
}

const KIND_ARBITRARIES: Readonly<Record<RegisteredKind, KindArbitrary>> = {
  [ContentKind.Action]: { data: actionData },
  [ContentKind.Ancestry]: { data: ancestryData },
  [ContentKind.Archetype]: { data: archetypeData },
  [ContentKind.Background]: { data: backgroundData },
  [ContentKind.Class]: { data: classData },
  [ContentKind.ClassFeature]: { data: classFeatureData, level: entryLevel },
  [ContentKind.Condition]: { data: conditionData },
  [ContentKind.Creature]: { data: creatureData, level: creatureLevel },
  [ContentKind.DamageType]: { data: emptyData },
  [ContentKind.Deity]: { data: deityOrPhilosophyData },
  [ContentKind.Effect]: { data: effectData },
  [ContentKind.Feat]: { data: featData, level: entryLevel },
  [ContentKind.Heritage]: { data: heritageData },
  [ContentKind.Language]: { data: emptyData },
  [ContentKind.Ritual]: { data: ritualData },
  [ContentKind.Sense]: { data: senseData },
  [ContentKind.Spell]: { data: spellData },
  [ContentKind.SpellcastingTradition]: { data: spellcastingTraditionData },
  [ContentKind.Statistic]: { data: statisticData },
  [ContentKind.Trait]: { data: traitData },
  [ContentKind.VariantRule]: { data: emptyData },
  ...EQUIPMENT_KIND_ARBITRARIES,
};

const bookPage: Arbitrary<object> = record({ kind: constant('book'), book: slugText, page: positive });
const bookAon: Arbitrary<object> = record({ kind: constant('book'), book: slugText, aon: aonUrl });
const webPage: Arbitrary<object> = record({ kind: constant('web'), url: constant('https://example.com/homebrew') });
const source: Arbitrary<object> = oneof(
  withOptional(bookPage, { aon: aonUrl }),
  bookAon,
  withOptional(webPage, { title: contentText }),
);

/** The parts of an entry that are its identity: pack and slug, with the id derived from them. */
interface EntryIdentity {
  readonly id: string;
  readonly pack: string;
  readonly slug: string;
}

const identity: Arbitrary<EntryIdentity> = tuple(slugText, slugText).map(([pack, slug]) => ({
  id: contentId(PackId.parse(pack), Slug.parse(slug)),
  pack,
  slug,
}));

/** A condition grants each condition it implies; other kinds have no `implies`, so nothing. */
function impliedGrants(data: object): object[] {
  const implies: unknown = Reflect.get(data, 'implies');
  return Array.isArray(implies) ? implies.map((item: unknown) => ({ key: 'GrantItem', item })) : [];
}

/** A kind's `data` with rules that keep it valid. */
interface DataAndRules {
  readonly data: object;
  readonly rules: object[];
}

/** A valid content entry of `kind`, as plain JSON (unparsed), with every optional field sometimes present. */
export function contentEntryJson(kind: RegisteredKind): Arbitrary<object> {
  const { data, level, levelless = false } = KIND_ARBITRARIES[kind];
  const dataAndRules: Arbitrary<DataAndRules> = tuple(data, array(ruleElementJson, { maxLength: LIST_MAX })).map(
    ([picked, rules]) => ({ data: picked, rules: [...rules, ...impliedGrants(picked)] }),
  );
  const required = tuple(identity, dataAndRules).chain(([{ id, pack, slug }, kindFields]) =>
    record({
      id: constant(id),
      pack: constant(pack),
      slug: constant(slug),
      kind: constant(kind),
      name: contentText,
      rarity,
      traits: uniqueArray(slugText, { maxLength: LIST_MAX }),
      sources: array(source, { minLength: 1, maxLength: LIST_MAX }),
      description: richTextJson,
      rules: constant(kindFields.rules),
      data: constant(kindFields.data),
      ...(level === undefined ? {} : { level }),
    }),
  );
  const externalIds = withOptional(constant({}), { foundry: contentText, aon: aonUrl, pathbuilder: contentText });
  return withOptional(required, {
    ...(level === undefined && !levelless ? { level: entryLevel } : {}),
    display: record({ category: displayCategory }),
    externalIds,
    // A random UUID never equals a UUIDv5 id, so these never supersede the entry itself.
    supersedes: array(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  }).map((json) => (onlyLevel1(json) ? Object.assign(json, { level: 1 }) : json));
}

/** A feat taken only at 1st level, which must then be level 1. */
function onlyLevel1(json: object): boolean {
  const data: unknown = Reflect.get(json, 'data');
  return typeof data === 'object' && data !== null && Reflect.get(data, 'onlyLevel1') === true;
}

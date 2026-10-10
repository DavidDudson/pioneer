import {
  array,
  boolean,
  constant,
  constantFrom,
  integer,
  oneof,
  option,
  record,
  stringMatching,
  tuple,
  uniqueArray,
  uuid,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ActionCategory, FrequencyPeriod } from '../action';
import { Attribute, ATTRIBUTE_MODIFIER_MAX, ATTRIBUTE_MODIFIER_MIN } from '../attribute';
import { ConditionGroup } from '../condition';
import { DisplayCategory, Rarity } from '../content-entry';
import { contentId, PackId, Slug } from '../content-id';
import { ContentKind } from '../content-kind';
import { DamageType, DamageTypeGroup } from '../damage';
import type { RegisteredKind } from '../kind-data';
import { ActionCost } from '../rich-text';
import { SenseAcuity } from '../sense';
import { Size } from '../size';
import { StatisticKind } from '../statistic';
import { CONTENT_LEVEL_MAX, LEVEL_MAX, LEVEL_MIN } from '../units';
import { actorFormulaText, keyPathText } from './arbitraries';
import { richTextJson } from './rich-text-arbitraries';
import { ruleElementJson } from './rule-element-arbitraries';

const LIST_MAX = 3;
const SMALLINT_MAX = 32_767;
const SLUG_WORDS_MAX = 3;
const AON_ID_MAX = 99_999;

const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
/** Kebab-case: pack ids, slugs, traits. */
export const slugText: Arbitrary<string> = array(word, { minLength: 1, maxLength: SLUG_WORDS_MAX }).map((words) =>
  words.join('-'),
);
const contentText: Arbitrary<string> = stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/u);
const smallint: Arbitrary<number> = integer({ min: 0, max: SMALLINT_MAX });
const modifier: Arbitrary<number> = integer({ min: -SMALLINT_MAX, max: SMALLINT_MAX });
const aonUrl: Arbitrary<string> = integer({ min: 1, max: AON_ID_MAX }).map(
  (id) => `https://2e.aonprd.com/Feats.aspx?ID=${id}`,
);

type OptionalEntry = readonly [string, unknown];

/** Builds a record whose optional keys are left out (not set to undefined) when absent. */
function withOptional<TRequired extends object>(
  required: Arbitrary<TRequired>,
  optional: Readonly<Record<string, Arbitrary<unknown>>>,
): Arbitrary<object> {
  const optionals = Object.entries(optional).map(([key, value]) =>
    option(value, { nil: undefined }).map((picked): OptionalEntry => [key, picked]),
  );
  return tuple(required, ...optionals).map(([fields, ...entries]): object => {
    const present = entries.filter(([, picked]) => picked !== undefined);
    return Object.fromEntries([...Object.entries(fields), ...present]);
  });
}

const size: Arbitrary<string> = constantFrom(...Object.values(Size));
const positive: Arbitrary<number> = integer({ min: 1, max: SMALLINT_MAX });
const damageType: Arbitrary<string> = constantFrom(...Object.values(DamageType));
const rarity: Arbitrary<string> = constantFrom(...Object.values(Rarity));
const displayCategory: Arbitrary<string> = constantFrom(...Object.values(DisplayCategory));
const statisticKind: Arbitrary<string> = constantFrom(...Object.values(StatisticKind));
const attribute: Arbitrary<string> = constantFrom(...Object.values(Attribute));

const ancestryData: Arbitrary<object> = record({
  hitPoints: smallint,
  size,
  speed: smallint,
});

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

const contentIdJson: Arbitrary<string> = uuid({ version: 4 });

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
/** A reaction always has a trigger; anything else may. */
const actionData: Arbitrary<object> = oneof(
  reaction,
  withOptional(constant({}), { cost: otherCost, trigger: richTextJson, ...actionUse }),
);

const conditionRefs: Arbitrary<string[]> = uniqueArray(contentIdJson, { maxLength: LIST_MAX });
const conditionData: Arbitrary<object> = withOptional(
  record({ valued: boolean(), overrides: conditionRefs, implies: conditionRefs }),
  { group: constantFrom(...Object.values(ConditionGroup)) },
);

const damageTypeData: Arbitrary<object> = withOptional(constant({}), {
  group: constantFrom(...Object.values(DamageTypeGroup)),
});

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

/** Valid `data` for each registered kind, and its level when the kind always has one. */
const KIND_ARBITRARIES: Readonly<
  Record<RegisteredKind, { readonly data: Arbitrary<object>; readonly level?: Arbitrary<number> }>
> = {
  [ContentKind.Action]: { data: actionData },
  [ContentKind.Ancestry]: { data: ancestryData },
  [ContentKind.Condition]: { data: conditionData },
  [ContentKind.Creature]: { data: creatureData, level: creatureLevel },
  [ContentKind.DamageType]: { data: damageTypeData },
  [ContentKind.Language]: { data: emptyData },
  [ContentKind.Sense]: { data: senseData },
  [ContentKind.Statistic]: { data: statisticData },
  [ContentKind.Trait]: { data: traitData },
  [ContentKind.VariantRule]: { data: emptyData },
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
  const { data, level } = KIND_ARBITRARIES[kind];
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
    ...(level === undefined ? { level: entryLevel } : {}),
    display: record({ category: displayCategory }),
    externalIds,
    // A random UUID never equals a UUIDv5 id, so these never supersede the entry itself.
    supersedes: array(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  });
}

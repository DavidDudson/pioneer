import {
  array,
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

import { Attribute, ATTRIBUTE_MODIFIER_MAX, ATTRIBUTE_MODIFIER_MIN } from '../attribute';
import { DisplayCategory, Rarity, REGISTERED_KINDS } from '../content-entry';
import type { RegisteredKind } from '../content-entry';
import { contentId, PackId, Slug } from '../content-id';
import { ContentKind } from '../content-kind';
import { DamageType } from '../damage';
import { Size } from '../size';
import { StatisticKind } from '../statistic';
import { CONTENT_LEVEL_MAX, LEVEL_MIN } from '../units';
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

/** Valid `data` for each registered kind, and whether the kind needs a level. */
const KIND_ARBITRARIES: Readonly<
  Record<RegisteredKind, { readonly data: Arbitrary<object>; readonly levelled: boolean }>
> = {
  [ContentKind.Ancestry]: { data: ancestryData, levelled: false },
  [ContentKind.Creature]: { data: creatureData, levelled: true },
  [ContentKind.Statistic]: { data: statisticData, levelled: false },
};

const bookPage: Arbitrary<object> = record({ kind: constant('book'), book: slugText, page: positive });
const bookAon: Arbitrary<object> = record({ kind: constant('book'), book: slugText, aon: aonUrl });
const webPage: Arbitrary<object> = record({ kind: constant('web'), url: constant('https://example.com/homebrew') });
const source: Arbitrary<object> = oneof(
  withOptional(bookPage, { aon: aonUrl }),
  bookAon,
  withOptional(webPage, { title: contentText }),
);

const level: Arbitrary<number> = integer({ min: LEVEL_MIN, max: CONTENT_LEVEL_MAX });

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

/** A valid content entry of `kind`, as plain JSON (unparsed), with every optional field sometimes present. */
export function contentEntryJson(kind: RegisteredKind): Arbitrary<object> {
  const { data, levelled } = KIND_ARBITRARIES[kind];
  const required = identity.chain(({ id, pack, slug }) =>
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
      rules: array(ruleElementJson, { maxLength: LIST_MAX }),
      data,
      ...(levelled ? { level } : {}),
    }),
  );
  const externalIds = withOptional(constant({}), { foundry: contentText, aon: aonUrl, pathbuilder: contentText });
  return withOptional(required, {
    ...(levelled ? {} : { level }),
    display: record({ category: displayCategory }),
    externalIds,
    // A random UUID never equals a UUIDv5 id, so these never supersede the entry itself.
    supersedes: array(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  });
}

/** A valid content entry of any registered kind. */
export const anyContentEntryJson: Arbitrary<object> = oneof(...REGISTERED_KINDS.map((kind) => contentEntryJson(kind)));

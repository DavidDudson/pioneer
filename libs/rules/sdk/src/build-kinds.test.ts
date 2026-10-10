import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = ContentEntry.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Each issue as `<path> <message key>`, sorted. */
function found(value: unknown): readonly string[] {
  return issues(value)
    .map((issue) => `${issue.path.join('.')} ${issue.message.key}`)
    .toSorted();
}

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));
const prose = (text: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/** The envelope of a Player Core entry, without its kind and data. */
function entry(slug: string, name: string): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

const FREE = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const elf = {
  ...entry('elf', 'Elf'),
  kind: 'ancestry',
  traits: ['elf', 'humanoid'],
  data: {
    hitPoints: 6,
    size: 'medium',
    speed: 30,
    boosts: [['dex'], ['int'], FREE],
    flaws: ['con'],
    languages: [idOf('common'), idOf('elven')],
    additionalLanguages: { count: 1, options: [idOf('draconic'), idOf('gnomish')] },
    vision: idOf('low-light-vision'),
    reach: 5,
  },
};

const ancientElf = { ...entry('ancient-elf', 'Ancient Elf'), kind: 'heritage', data: { ancestry: idOf('elf') } };
const changeling = { ...entry('changeling', 'Changeling'), kind: 'heritage', data: {} };

const farmhand = {
  ...entry('farmhand', 'Farmhand'),
  kind: 'background',
  rules: [
    { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' },
    { key: 'Proficiency', selector: 'skill:lore-farming', rank: 'trained' },
    { key: 'GrantItem', item: idOf('assurance') },
  ],
  data: { boosts: [['con', 'wis'], FREE] },
};

const classFeats = (level: number): object => ({
  key: 'ChoiceSet',
  flag: `class-feat-${level}`,
  choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
  predicate: [{ gte: ['self:level', level] }],
});

const fighter = {
  ...entry('fighter', 'Fighter'),
  kind: 'class',
  rules: [
    { key: 'Proficiency', selector: 'perception', rank: 'expert' },
    { key: 'Proficiency', selector: 'save:fortitude', rank: 'expert' },
    { key: 'GrantItem', item: idOf('reactive-strike') },
    classFeats(1),
    classFeats(2),
    { key: 'GrantItem', item: idOf('bravery'), predicate: [{ gte: ['self:level', 3] }] },
  ],
  data: { keyAttribute: ['str', 'dex'], hitPoints: 10, additionalSkills: 3 },
};

const reactiveStrike = {
  ...entry('reactive-strike', 'Reactive Strike'),
  kind: 'class-feature',
  level: 1,
  rules: [{ key: 'GrantItem', item: idOf('reactive-strike-action') }],
  data: {},
};

const suddenCharge = {
  ...entry('sudden-charge', 'Sudden Charge'),
  kind: 'feat',
  level: 1,
  traits: ['fighter', 'flourish', 'open'],
  data: { category: 'class', action: { cost: 'two' } },
};

const additionalLore = {
  ...entry('additional-lore', 'Additional Lore'),
  kind: 'feat',
  level: 1,
  traits: ['general', 'skill'],
  display: { category: 'grant-only' },
  data: { category: 'skill', prerequisites: prose('trained in Lore'), maxTakable: 'unlimited' },
};

const fighterArchetype = {
  ...entry('fighter-archetype', 'Fighter'),
  kind: 'archetype',
  data: { dedication: idOf('fighter-dedication'), multiclass: idOf('fighter') },
};

const pharasma = {
  ...entry('pharasma', 'Pharasma'),
  kind: 'deity',
  data: {
    category: 'deity',
    domains: { primary: ['death', 'fate', 'healing', 'knowledge'], alternate: ['soul', 'time', 'vigil'] },
    font: ['heal'],
    attributes: ['con', 'wis'],
    skills: ['skill:medicine'],
    weapons: ['dagger'],
    spells: [
      { rank: 1, spell: idOf('mindlink') },
      { rank: 3, spell: idOf('ghostly-weapon') },
      { rank: 4, spell: idOf('vision-of-death') },
    ],
  },
};

describe('build kinds', () => {
  test.each([
    ['an ancestry', elf],
    ['a heritage of one ancestry', ancientElf],
    ['a versatile heritage', changeling],
    ['a background', farmhand],
    ['a class with its progression in rules', fighter],
    ['a class feature that grants an action', reactiveStrike],
    ['a feat used as an action', suddenCharge],
    ['a feat with prerequisites taken any number of times', additionalLore],
    ['a multiclass archetype', fighterArchetype],
    ['a deity', pharasma],
    [
      'a sanctified deity',
      { ...pharasma, data: { ...pharasma.data, sanctification: { modal: 'can', what: ['holy', 'unholy'] } } },
    ],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('a boost lists each attribute once, and at least one', () => {
    const repeated = { ...elf, data: { ...elf.data, boosts: [['dex', 'dex'], []] } };

    expect(issues(repeated)).toStrictEqual([
      { path: ['data', 'boosts', 0, 1], message: message(RulesMessage.ListDuplicate, { value: 'dex' }) },
      { path: ['data', 'boosts', 1], message: message(ValidationMessage.TooSmall, { origin: 'array', minimum: 1 }) },
    ]);
  });

  test('lists name each language and attribute once', () => {
    const common = idOf('common');
    const repeated = { ...elf, data: { ...elf.data, flaws: ['con', 'con'], languages: [common, common] } };

    expect(found(repeated)).toStrictEqual([
      `data.flaws.1 ${RulesMessage.ListDuplicate}`,
      `data.languages.1 ${RulesMessage.ListDuplicate}`,
    ]);
  });

  test('a class needs a key attribute', () => {
    expect(found({ ...fighter, data: { ...fighter.data, keyAttribute: [] } })).toStrictEqual([
      `data.keyAttribute ${ValidationMessage.TooSmall}`,
    ]);
  });

  test('feats and class features always have a level', () => {
    const { level: _featLevel, ...unlevelledFeat } = suddenCharge;
    const { level: _featureLevel, ...unlevelledFeature } = reactiveStrike;

    expect(found(unlevelledFeat)).toStrictEqual([`level ${ValidationMessage.InvalidType}`]);
    expect(found(unlevelledFeature)).toStrictEqual([`level ${ValidationMessage.InvalidType}`]);
  });

  test("checks a feat's category, takes and action", () => {
    const invalid = {
      ...suddenCharge,
      data: { category: 'archetype', maxTakable: 0, action: { cost: 'reaction' } },
    };

    expect(found(invalid)).toStrictEqual([
      `data.action.trigger ${RulesMessage.ActionReactionTrigger}`,
      `data.category ${ValidationMessage.InvalidValue}`,
      `data.maxTakable ${ValidationMessage.TooSmall}`,
    ]);
  });

  test('a deity grants one spell per rank', () => {
    const twice = {
      ...pharasma,
      data: { ...pharasma.data, spells: [...pharasma.data.spells, { rank: 1, spell: idOf('spirit-link') }] },
    };

    expect(issues(twice)).toStrictEqual([
      { path: ['data', 'spells', 3, 'rank'], message: message(RulesMessage.DeitySpellRank, { rank: 1 }) },
    ]);
  });

  test("checks a deity's category, font and sanctification", () => {
    const invalid = {
      ...pharasma,
      data: {
        ...pharasma.data,
        category: 'demigod',
        font: ['heal', 'heal'],
        sanctification: { modal: 'may', what: [] },
        spells: [{ rank: 11, spell: idOf('heal') }],
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.category ${ValidationMessage.InvalidValue}`,
      `data.font.1 ${RulesMessage.ListDuplicate}`,
      `data.sanctification.modal ${ValidationMessage.InvalidValue}`,
      `data.sanctification.what ${ValidationMessage.TooSmall}`,
      `data.spells.0.rank ${ValidationMessage.TooBig}`,
    ]);
  });

  test('a philosophy grants no font, domains or spells', () => {
    const philosophy = { ...pharasma, data: { ...pharasma.data, category: 'philosophy' } };
    const empty = {
      ...philosophy,
      data: { ...philosophy.data, domains: { primary: [], alternate: [] }, font: [], spells: [] },
    };

    expect(found(philosophy)).toStrictEqual([
      `data.domains.alternate ${RulesMessage.DeityPhilosophy}`,
      `data.domains.primary ${RulesMessage.DeityPhilosophy}`,
      `data.font ${RulesMessage.DeityPhilosophy}`,
      `data.spells ${RulesMessage.DeityPhilosophy}`,
    ]);
    expect(issues(empty)).toStrictEqual([]);
  });

  test('divine skills are skill selectors', () => {
    expect(found({ ...pharasma, data: { ...pharasma.data, skills: ['skill:lore-boneyard', 'ac'] } })).toStrictEqual([
      `data.skills.1 ${RulesMessage.DeitySkill}`,
    ]);
  });

  test('a feat taken only at 1st level is a 1st-level feat', () => {
    const lineage = { ...suddenCharge, data: { ...suddenCharge.data, onlyLevel1: true } };

    expect(issues(lineage)).toStrictEqual([]);
    expect(issues({ ...lineage, level: 2 })).toStrictEqual([
      { path: ['level'], message: message(RulesMessage.FeatOnlyLevel1) },
    ]);
  });

  test('rejects data fields a kind does not have', () => {
    expect(found({ ...farmhand, data: { ...farmhand.data, trainedSkills: ['athletics'] } })).toStrictEqual([
      `data.trainedSkills ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...fighter, data: { ...fighter.data, classFeatLevels: [1, 2] } })).toStrictEqual([
      `data.classFeatLevels ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...changeling, data: { versatile: true } })).toStrictEqual([
      `data.versatile ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});

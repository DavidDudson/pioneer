import { describe, expect, test } from 'bun:test';

import {
  ContentEntry,
  contentId,
  ContentKey,
  ContentKind,
  EntrySlug,
  PackId,
  Predicate,
  RichText,
  RollOption,
} from '@pioneer/rules/sdk';

import { prerequisiteMatches, readPrerequisites } from './prerequisite-matcher';
import { prerequisiteNames } from './prerequisite-names';
import type { NamedEntry, PrerequisiteNames } from './prerequisite-names';

const PACK = 'player-core';

const prose = (words: string): RichText =>
  RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: words }] }]);
const named = (kind: ContentKind, option: string): NamedEntry => ({ kind, option: RollOption.parse(option) });

const NAMES: PrerequisiteNames = {
  entries: new Map([
    [
      'shield block',
      [named(ContentKind.Feat, 'feat:shield-block'), named(ContentKind.ClassFeature, 'feature:shield-block')],
    ],
    ['fighter dedication', [named(ContentKind.Feat, 'feat:fighter-dedication')]],
    ['rogue dedication', [named(ContentKind.Feat, 'feat:rogue-dedication')]],
    ['cat fall', [named(ContentKind.Feat, 'feat:cat-fall')]],
    ['leaf leshy', [named(ContentKind.Heritage, 'heritage:leaf-leshy')]],
    ['dwarf', [named(ContentKind.Ancestry, 'ancestry:dwarf')]],
    ['cleric', [named(ContentKind.Class, 'class:cleric')]],
    ['sarenrae', [named(ContentKind.Deity, 'deity:primary:sarenrae')]],
    ['warrior', [named(ContentKind.ClassFeature, 'feature:warrior')]],
    ['leaf order', [named(ContentKind.ClassFeature, 'feature:leaf-order')]],
  ]),
  variants: new Map([
    [
      'incredible companion',
      [
        named(ContentKind.Feat, 'feat:incredible-companion-druid'),
        named(ContentKind.Feat, 'feat:incredible-companion-ranger'),
      ],
    ],
  ]),
  statistics: new Map([
    ['athletics', 'skill:athletics'],
    ['nature', 'skill:nature'],
    ['religion', 'skill:religion'],
    ['arcana', 'skill:arcana'],
    ['occultism', 'skill:occultism'],
    ['perception', 'perception'],
    ['cooking lore', 'skill:lore:cooking'],
  ]),
};

const read = (words: string): Predicate | undefined => readPrerequisites(prose(words), NAMES).predicate;
const predicate = (statements: unknown): Predicate => Predicate.parse(statements);

describe('prerequisite matcher', () => {
  test.each([
    ['trained in Athletics', [{ gte: ['skill:athletics:rank', 1] }]],
    ['expert in Perception', [{ gte: ['perception:rank', 2] }]],
    ['master in Cooking Lore', [{ gte: ['skill:lore:cooking:rank', 3] }]],
    [
      'legendary in Arcana, Nature, Occultism, or Religion',
      [
        {
          or: [
            { gte: ['skill:arcana:rank', 4] },
            { gte: ['skill:nature:rank', 4] },
            { gte: ['skill:occultism:rank', 4] },
            { gte: ['skill:religion:rank', 4] },
          ],
        },
      ],
    ],
    ['trained in Nature and Religion', [{ gte: ['skill:nature:rank', 1] }, { gte: ['skill:religion:rank', 1] }]],
  ])('reads a skill rank: "%s"', (words, expected) => {
    expect(read(words)).toStrictEqual(predicate(expected));
  });

  test.each([
    ['Strength +2', [{ gte: ['attribute:str:mod', 2] }]],
    ['Charisma +3', [{ gte: ['attribute:cha:mod', 3] }]],
  ])('reads an attribute minimum as Foundry writes it: "%s"', (words, expected) => {
    expect(read(words)).toStrictEqual(predicate(expected));
  });

  test.each([
    ['8th level', [{ gte: ['self:level', 8] }]],
    ['level 2', [{ gte: ['self:level', 2] }]],
  ])('reads a level: "%s"', (words, expected) => {
    expect(read(words)).toStrictEqual(predicate(expected));
  });

  test.each([
    ['holy', ['self:trait:holy']],
    ['unholy trait', ['self:trait:unholy']],
    ['holy or unholy trait', [{ or: ['self:trait:holy', 'self:trait:unholy'] }]],
  ])('reads a sanctification trait: "%s"', (words, expected) => {
    expect(read(words)).toStrictEqual(predicate(expected));
  });

  test.each([
    ['Fighter Dedication', ['feat:fighter-dedication']],
    ['Dwarf', ['ancestry:dwarf']],
    ['Cleric', ['class:cleric']],
    ['Sarenrae', ['deity:primary:sarenrae']],
    ['leaf order', ['feature:leaf-order']],
    ['warrior muse', ['feature:warrior']],
    ['leaf leshy heritage or Cat Fall skill feat', [{ or: ['heritage:leaf-leshy', 'feat:cat-fall'] }]],
    ['Fighter Dedication or Rogue Dedication', [{ or: ['feat:fighter-dedication', 'feat:rogue-dedication'] }]],
  ])('reads a name as the option its entry sets: "%s"', (words, expected) => {
    expect(read(words)).toStrictEqual(predicate(expected));
  });

  test('a name several entries share is met by any of them', () => {
    expect(read('Shield Block')).toStrictEqual(predicate([{ or: ['feat:shield-block', 'feature:shield-block'] }]));
  });

  test('a name without its class in brackets is met by any of its variants', () => {
    expect(read('Incredible Companion')).toStrictEqual(
      predicate([{ or: ['feat:incredible-companion-druid', 'feat:incredible-companion-ranger'] }]),
    );
  });

  test('a kind word only narrows to that kind', () => {
    expect(read('Cleric heritage')).toBeUndefined();
  });

  test('every clause must hold', () => {
    expect(read('Fighter Dedication; trained in Athletics; Strength +2')).toStrictEqual(
      predicate(['feat:fighter-dedication', { gte: ['skill:athletics:rank', 1] }, { gte: ['attribute:str:mod', 2] }]),
    );
  });

  test('ignores case, spacing, curly apostrophes and the full stop', () => {
    expect(read('  TRAINED in\nathletics. ')).toStrictEqual(predicate([{ gte: ['skill:athletics:rank', 1] }]));
  });

  test.each([
    ['an unknown name', 'Swashbuckler Dedication'],
    ['an unknown skill', 'trained in Lore'],
    ['a rank in anything but a statistic', 'expert in Reflex saves'],
    ['a list that mixes "and" and "or"', 'trained in Athletics and Nature or Religion'],
    ['a list that says neither', 'Fighter Dedication, Rogue Dedication'],
    ['free text', 'an animal companion'],
    ['an attribute that is no attribute', 'Luck +2'],
  ])('leaves %s unparsed', (_name, words) => {
    expect(readPrerequisites(prose(words), NAMES)).toStrictEqual({
      predicate: undefined,
      unparsed: [words.toLowerCase()],
    });
  });

  test('gives no predicate when any clause is unparsed, and names the clauses that are', () => {
    expect(readPrerequisites(prose('Fighter Dedication; an animal companion'), NAMES)).toStrictEqual({
      predicate: undefined,
      unparsed: ['an animal companion'],
    });
  });

  test('leaves prerequisites richer than one paragraph of text unread', () => {
    const twoParagraphs = RichText.parse([
      { type: 'paragraph', content: [{ type: 'text', text: 'Fighter Dedication' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Strength +2' }] },
    ]);

    expect(readPrerequisites(twoParagraphs, NAMES)).toStrictEqual({ predicate: undefined, unparsed: [] });
  });
});

/** A Player Core entry of `kind` with `data`. */
function entry(name: string, kind: string, data: object): ContentEntry {
  const slug = `${kind}:${name
    .toLowerCase()
    .replaceAll(/[^a-z]+/gu, '-')
    .replace(/-$/u, '')}`;
  return ContentEntry.parse({
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    kind,
    ...(kind === 'statistic' ? {} : { level: 1 }),
    data,
  });
}

const skill = (name: string, selector: string): ContentEntry =>
  entry(name, 'statistic', { selector, domains: ['skill-check'], base: '@attr.str', kind: 'check' });

describe('prerequisite names', () => {
  test('index named kinds by name, variants by their name without brackets, and ranked statistics', () => {
    const names = prerequisiteNames([
      entry('Shield Block', 'feat', { category: 'general' }),
      entry('Shield Block', 'class-feature', {}),
      entry('Counterspell (Prepared)', 'feat', { category: 'class' }),
      skill('Athletics', 'skill:athletics'),
      skill('Perception', 'perception'),
      skill('Fortitude', 'save:fortitude'),
    ]);

    expect(names.entries.get('shield block')).toStrictEqual([
      named(ContentKind.Feat, 'feat:shield-block'),
      named(ContentKind.ClassFeature, 'feature:shield-block'),
    ]);
    expect(names.variants.get('counterspell')).toStrictEqual([named(ContentKind.Feat, 'feat:counterspell-prepared')]);
    expect(names.statistics).toStrictEqual(
      new Map([
        ['athletics', 'skill:athletics'],
        ['perception', 'perception'],
      ]),
    );
  });
});

describe('prerequisite matches', () => {
  test('read each feat with prerequisites and no predicate', () => {
    const entries = [
      entry('Shield Block', 'feat', { category: 'general' }),
      entry('Shield Warden', 'feat', { category: 'class', prerequisites: prose('Shield Block') }),
      entry('Corrected', 'feat', {
        category: 'class',
        prerequisites: prose('Shield Block'),
        prerequisitePredicate: ['feat:other'],
      }),
      entry('Unparsed', 'feat', { category: 'class', prerequisites: prose('an animal companion') }),
    ];

    expect(prerequisiteMatches(entries)).toStrictEqual([
      {
        entry: ContentKey.parse('player-core/feat:shield-warden'),
        prerequisitePredicate: predicate(['feat:shield-block']),
      },
    ]);
  });
});

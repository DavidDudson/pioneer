import { describe, expect, test } from 'bun:test';

import {
  ContentEntry,
  contentId,
  ContentKey,
  ContentKind,
  ContentText,
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
      [named(ContentKind.Feat, 'feat:shield-block'), named(ContentKind.AncestryFeature, 'feature:shield-block')],
    ],
    ['fighter dedication', [named(ContentKind.Feat, 'feat:fighter-dedication')]],
    ['rogue dedication', [named(ContentKind.Feat, 'feat:rogue-dedication')]],
    ['cat fall', [named(ContentKind.Feat, 'feat:cat-fall')]],
    ['leaf leshy', [named(ContentKind.Heritage, 'heritage:leaf-leshy')]],
    ['dwarf', [named(ContentKind.Ancestry, 'ancestry:dwarf')]],
    ['cleric', [named(ContentKind.Class, 'class:cleric')]],
    ['sarenrae', [named(ContentKind.Deity, 'deity:primary:sarenrae')]],
    ["warden's boon", [named(ContentKind.Feat, 'feat:wardens-boon')]],
    ['animal companion', [named(ContentKind.Feat, 'feat:animal-companion')]],
  ]),
  variants: new Map([
    ['animal companion', [named(ContentKind.Feat, 'feat:animal-companion-ranger')]],
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
    ['leaf leshy heritage or Cat Fall skill feat', [{ or: ['heritage:leaf-leshy', 'feat:cat-fall'] }]],
    ['Dwarf ancestry', ['ancestry:dwarf']],
    ['Cleric class', ['class:cleric']],
    ['Sarenrae deity', ['deity:primary:sarenrae']],
    ['Fighter Dedication feat', ['feat:fighter-dedication']],
    ['Fighter Dedication class feat', ['feat:fighter-dedication']],
    ['Cat Fall ancestry feat', ['feat:cat-fall']],
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

  test('a name is met by the entry with it and by its variants', () => {
    expect(read('Animal Companion')).toStrictEqual(
      predicate([{ or: ['feat:animal-companion', 'feat:animal-companion-ranger'] }]),
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
    expect(read('Warden’s Boon')).toStrictEqual(predicate(['feat:wardens-boon']));
  });

  test('a trailing separator ends the list without a clause', () => {
    expect(read('Fighter Dedication;')).toStrictEqual(predicate(['feat:fighter-dedication']));
  });

  test.each([' ', ';', '.', ' ; . '])('gives no predicate for text with no clause: "%s"', (words) => {
    expect(readPrerequisites(prose(words), NAMES)).toStrictEqual({ predicate: undefined, unparsed: [], clauses: [] });
  });

  test.each([
    ['an unknown name', 'Swashbuckler Dedication'],
    ['a class feature, which an archetype gives without its option', 'warrior muse'],
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
      clauses: [{ text: ContentText.parse(words), predicate: undefined }],
    });
  });

  test('gives no predicate when any clause is unparsed, and names the clauses that are', () => {
    expect(readPrerequisites(prose('Fighter Dedication;  an animal companion '), NAMES)).toStrictEqual({
      predicate: undefined,
      unparsed: ['an animal companion'],
      clauses: [
        { text: ContentText.parse('Fighter Dedication'), predicate: predicate(['feat:fighter-dedication']) },
        { text: ContentText.parse('an animal companion'), predicate: undefined },
      ],
    });
  });

  test('leaves prerequisites richer than one paragraph of text unread', () => {
    const twoParagraphs = RichText.parse([
      { type: 'paragraph', content: [{ type: 'text', text: 'Fighter Dedication' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Strength +2' }] },
    ]);

    expect(readPrerequisites(twoParagraphs, NAMES)).toStrictEqual({ predicate: undefined, unparsed: [], clauses: [] });
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
  test('index named kinds but class features by name, variants by their name without brackets, and ranked statistics', () => {
    const names = prerequisiteNames([
      entry('Shield Block', 'feat', { category: 'general' }),
      entry('Shield Block', 'class-feature', {}),
      entry('Leaf Order', 'class-feature', {}),
      entry('Counterspell (Prepared)', 'feat', { category: 'class' }),
      skill('Athletics', 'skill:athletics'),
      skill('Perception', 'perception'),
      skill('Fortitude', 'save:fortitude'),
    ]);

    expect(names.entries.get('shield block')).toStrictEqual([named(ContentKind.Feat, 'feat:shield-block')]);
    expect(names.entries.has('leaf order')).toBe(false);
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
        prerequisiteClauses: undefined,
      },
    ]);
  });

  test('read the clauses of a feat with several, and keep a predicate it already has', () => {
    const entries = [
      entry('Shield Block', 'feat', { category: 'general' }),
      entry('Corrected', 'feat', {
        category: 'class',
        prerequisites: prose('Shield Block; an animal companion'),
        prerequisitePredicate: ['feat:other'],
      }),
    ];

    expect(prerequisiteMatches(entries)).toStrictEqual([
      {
        entry: ContentKey.parse('player-core/feat:corrected'),
        prerequisitePredicate: undefined,
        prerequisiteClauses: [
          { text: ContentText.parse('Shield Block'), predicate: predicate(['feat:shield-block']) },
          { text: ContentText.parse('an animal companion'), predicate: undefined },
        ],
      },
    ]);
  });
});

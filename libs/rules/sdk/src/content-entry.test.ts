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

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));
const playerCorePage = { kind: 'book', book: 'player-core', page: 42 };
const description = [{ type: 'paragraph', content: [{ type: 'text', text: 'Short and adaptable.' }] }];

const human = {
  id: idOf('human'),
  pack: PACK,
  kind: 'ancestry',
  slug: 'human',
  name: 'Human',
  rarity: 'common',
  traits: ['human', 'humanoid'],
  sources: [playerCorePage],
  description,
  rules: [],
  data: { hitPoints: 8, size: 'medium', speed: 25 },
};

const giantRat = {
  id: contentId(PackId.parse('monster-core'), Slug.parse('giant-rat')),
  pack: 'monster-core',
  kind: 'creature',
  slug: 'giant-rat',
  name: 'Giant Rat',
  level: -1,
  rarity: 'common',
  traits: ['animal'],
  sources: [{ kind: 'book', book: 'monster-core', page: 1 }],
  description,
  rules: [],
  externalIds: { foundry: 'Compendium.pf2e.pathfinder-monster-core.Actor.abc123' },
  data: {
    size: 'small',
    perception: 5,
    attributes: { str: 1, dex: 3, con: 2, int: -4, wis: 1, cha: -3 },
    armorClass: 15,
    saves: { fortitude: 6, reflex: 7, will: 3 },
    hitPoints: 8,
    immunities: [],
    weaknesses: [],
    resistances: [],
    speed: 30,
  },
};

const fortitude = {
  id: idOf('fortitude'),
  pack: PACK,
  kind: 'statistic',
  slug: 'fortitude',
  name: 'Fortitude',
  rarity: 'common',
  traits: [],
  sources: [playerCorePage],
  description,
  rules: [],
  display: { category: 'narrative' },
  data: {
    selector: 'save:fortitude',
    domains: ['saving-throw'],
    base: '@attr.con + @prof.save.fortitude',
    kind: 'check',
    keyAttribute: 'con',
  },
};

describe('ContentEntry', () => {
  test('accepts an entry of every registered kind', () => {
    expect(issues(human)).toStrictEqual([]);
    expect(issues(giantRat)).toStrictEqual([]);
    expect(issues(fortitude)).toStrictEqual([]);
  });

  test('checks data against the schema for its kind', () => {
    const wrongData = { ...human, data: fortitude.data };

    expect(issues(wrongData).map((issue) => issue.path)).toContainEqual(['data', 'hitPoints']);
  });

  test('names a kind with no schema', () => {
    expect(issues({ ...human, kind: 'spell' })).toStrictEqual([
      { path: ['kind'], message: message(RulesMessage.EntryUnknownKind, { kind: 'spell' }) },
    ]);
    expect(issues({ ...human, kind: 'feat' })).toStrictEqual([
      { path: ['kind'], message: message(RulesMessage.EntryUnknownKind, { kind: 'feat' }) },
    ]);
  });

  test('rejects an id that is not derived from pack and slug', () => {
    const expected = idOf('human');

    expect(issues({ ...human, id: idOf('elf') })).toStrictEqual([
      { path: ['id'], message: message(RulesMessage.EntryIdMismatch, { expected, key: 'player-core/human' }) },
    ]);
  });

  test('needs at least one source', () => {
    expect(issues({ ...human, sources: [] })).toStrictEqual([
      { path: ['sources'], message: message(ValidationMessage.TooSmall, { origin: 'array', minimum: 1 }) },
    ]);
  });

  test('checks each source as a SourceRef', () => {
    expect(issues({ ...human, sources: [{ kind: 'book', book: 'player-core' }] })).toStrictEqual([
      { path: ['sources', 0], message: message(RulesMessage.BookLocation) },
    ]);
  });

  test('rejects a trait listed twice', () => {
    expect(issues({ ...human, traits: ['human', 'humanoid', 'human'] })).toStrictEqual([
      { path: ['traits', 2], message: message(RulesMessage.EntryDuplicateTrait, { trait: 'human' }) },
    ]);
  });

  test('takes levels from 0 to 30', () => {
    expect(issues({ ...human, level: 0 })).toStrictEqual([]);
    expect(issues({ ...human, level: 30 })).toStrictEqual([]);
    expect(issues({ ...human, level: 31 }).map((issue) => issue.message.key)).toStrictEqual([ValidationMessage.TooBig]);
    expect(issues({ ...human, level: -1 }).map((issue) => issue.message.key)).toStrictEqual([
      ValidationMessage.TooSmall,
    ]);
  });

  test('takes creature levels from -1 to 25', () => {
    expect(issues({ ...giantRat, level: 25 })).toStrictEqual([]);
    expect(issues({ ...giantRat, level: 26 }).map((issue) => issue.message.key)).toStrictEqual([
      ValidationMessage.TooBig,
    ]);
    expect(issues({ ...giantRat, level: -2 }).map((issue) => issue.message.key)).toStrictEqual([
      ValidationMessage.TooSmall,
    ]);
  });

  test('needs a level on a creature', () => {
    const { level: _level, ...unlevelled } = giantRat;

    expect(issues(unlevelled)).toStrictEqual([
      { path: ['level'], message: message(ValidationMessage.InvalidType, { expected: 'number' }) },
    ]);
  });

  test('checks external ids and display hints', () => {
    const invalid = issues({
      ...human,
      externalIds: { aon: 'https://example.com/human', pf2etools: 'human' },
      display: { category: 'hidden' },
    });

    const found = invalid.map((issue) => `${issue.path.join('.')} ${issue.message.key}`).toSorted();

    expect(found).toStrictEqual([
      `display.category ${ValidationMessage.InvalidValue}`,
      `externalIds.aon ${RulesMessage.AonUrl}`,
      `externalIds.pf2etools ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });

  test('never supersedes itself', () => {
    expect(issues({ ...human, supersedes: [idOf('legacy-human'), human.id] })).toStrictEqual([
      { path: ['supersedes', 1], message: message(RulesMessage.EntrySupersedesSelf) },
    ]);
  });

  test('checks the description as rich text and the rules as rule elements', () => {
    const paths = issues({
      ...human,
      description: [{ type: 'html', html: '<b>hi</b>' }],
      rules: [{ key: 'NotAnElement' }],
    }).map((issue) => issue.path);

    expect(paths).toContainEqual(['description', 0, 'type']);
    expect(paths).toContainEqual(['rules', 0, 'key']);
  });

  test('rejects fields the envelope does not have', () => {
    expect(issues({ ...human, hitPoints: 8 })).toStrictEqual([
      { path: ['hitPoints'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'hitPoints' }) },
    ]);
    expect(issues({ ...human, data: { ...human.data, slug: 'human' } }).map((issue) => issue.path)).toStrictEqual([
      ['data', 'slug'],
    ]);
  });
});

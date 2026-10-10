import { describe, expect, test } from 'bun:test';

import { contentId, PackId, Slug } from './content-id';
import { contentPackFromFiles } from './content-pack-file';
import { ProficiencyBonusTable } from './proficiency';

const PACK = 'homebrew';
const idOf = (slug: string, pack: string = PACK): string => contentId(PackId.parse(pack), Slug.parse(slug));
const page = [{ kind: 'book', book: 'player-core', page: 1 }];
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

interface EntryFields {
  readonly kind: string;
  readonly slug: string;
  readonly data: object;
}

function entry({ kind, slug, data }: EntryFields, extra: object = {}): object {
  return {
    id: idOf(slug),
    pack: PACK,
    kind,
    slug,
    name: slug,
    rarity: 'common',
    traits: [],
    sources: page,
    description: [],
    rules: [],
    data,
    ...extra,
  };
}

const ancestry = entry(
  {
    kind: 'ancestry',
    slug: 'lizardfolk',
    data: {
      hitPoints: 8,
      size: 'medium',
      speed: 25,
      boosts: [['str'], ['wis']],
      flaws: ['int'],
      languages: [idOf('common')],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  },
  { traits: ['humanoid', 'lizardfolk'] },
);
const creature = entry(
  {
    kind: 'creature',
    slug: 'mud-crab',
    data: {
      size: 'small',
      perception: 3,
      attributes: { str: 2, dex: 1, con: 2, int: -5, wis: 0, cha: -4 },
      armorClass: 16,
      saves: { fortitude: 7, reflex: 5, will: 3 },
      hitPoints: 15,
      immunities: [],
      weaknesses: [],
      resistances: [],
      speed: 20,
    },
  },
  { level: 1, traits: ['animal'] },
);
const statistic = entry({
  kind: 'statistic',
  slug: 'swim-check',
  data: {
    selector: 'skill:athletics',
    domains: ['check'],
    base: '@attr.str + @prof.skill.athletics',
    kind: 'check',
    keyAttribute: 'str',
  },
});
const variantRule = entry(
  { kind: 'variant-rule', slug: 'flat-bonus', data: {} },
  {
    rules: [
      {
        key: 'ProficiencyBonus',
        table: { untrained: '0', trained: '2', expert: '4', master: '6', legendary: '8' },
      },
    ],
  },
);
const language = entry({ kind: 'language', slug: 'common', data: {} });

describe('contentPackFromFiles', () => {
  test('each kind the registry serves becomes its definition, with the envelope fields', () => {
    const pack = contentPackFromFiles(packFile, [[ancestry, language], [creature], [statistic, variantRule]]);
    expect(pack.id).toBe(PackId.parse(PACK));
    expect(pack.ancestries).toMatchObject([
      { slug: 'lizardfolk', name: 'lizardfolk', traits: ['humanoid', 'lizardfolk'], hitPoints: 8, sources: page },
    ]);
    expect(pack.creatures).toMatchObject([{ slug: 'mud-crab', level: 1, traits: ['animal'], armorClass: 16 }]);
    expect(pack.statistics).toMatchObject([{ slug: 'swim-check', selector: 'skill:athletics', sources: page }]);
    expect(pack.variantRules).toMatchObject([{ slug: 'flat-bonus', rules: [{ key: 'ProficiencyBonus' }] }]);
    expect(pack.otherEntries).toMatchObject([{ kind: 'language', slug: 'common' }]);
  });

  test('the proficiency bonus table comes from pack.json', () => {
    const table = { untrained: '0', trained: '2 + @level', expert: '4 + @level', master: '6', legendary: '8' };
    const pack = contentPackFromFiles({ ...packFile, proficiencyBonus: table }, []);
    expect(pack.proficiencyBonus).toStrictEqual(ProficiencyBonusTable.parse(table));
  });

  test('an entry filed under another pack is refused', () => {
    const stray = { ...language, id: idOf('common', 'player-core'), pack: 'player-core' };
    expect(() => contentPackFromFiles(packFile, [[stray]])).toThrow('Entry "player-core/common" is filed under pack');
  });

  test('an invalid entry or pack.json fails to parse', () => {
    expect(() => contentPackFromFiles(packFile, [[{ ...language, sources: [] }]])).toThrow();
    expect(() => contentPackFromFiles({ ...packFile, extra: true }, [])).toThrow();
  });

  test('two entries with one slug are refused', () => {
    expect(() => contentPackFromFiles(packFile, [[ancestry], [ancestry]])).toThrow('Duplicate ancestry slug');
  });
});

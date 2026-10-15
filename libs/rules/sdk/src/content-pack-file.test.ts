import { describe, expect, test } from 'bun:test';

import { contentId, EntrySlug, PackId } from './content-id';
import { contentPackFromFiles } from './content-pack-file';
import { ProficiencyBonusTable } from './proficiency';

const PACK = 'homebrew';
const idOf = (slug: string, pack: string = PACK): string => contentId(PackId.parse(pack), EntrySlug.parse(slug));
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
    name: slug.split(':')[1],
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
    slug: 'ancestry:lizardfolk',
    data: {
      hitPoints: 8,
      size: 'medium',
      speed: 25,
      boosts: [['str'], ['wis']],
      flaws: ['int'],
      languages: [idOf('language:common')],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  },
  { traits: ['humanoid', 'lizardfolk'] },
);
const creature = entry(
  {
    kind: 'creature',
    slug: 'creature:mud-crab',
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
  slug: 'statistic:swim-check',
  data: {
    selector: 'skill:athletics',
    domains: ['check'],
    base: '@attr.str + @prof.skill.athletics',
    kind: 'check',
    keyAttribute: 'str',
  },
});
const variantRule = entry(
  { kind: 'variant-rule', slug: 'variant-rule:flat-bonus', data: {} },
  {
    rules: [
      {
        key: 'ProficiencyBonus',
        table: { untrained: '0', trained: '2', expert: '4', master: '6', legendary: '8' },
      },
    ],
  },
);
const language = entry({ kind: 'language', slug: 'language:common', data: {} });

describe('contentPackFromFiles', () => {
  test('each kind the registry serves becomes its definition, with the envelope fields', () => {
    const pack = contentPackFromFiles(packFile, [[ancestry, language], [creature], [statistic, variantRule]]);
    expect(pack.id).toBe(PackId.parse(PACK));
    expect(pack.ancestries).toMatchObject([
      {
        slug: 'ancestry:lizardfolk',
        name: 'lizardfolk',
        traits: ['humanoid', 'lizardfolk'],
        hitPoints: 8,
        sources: page,
      },
    ]);
    expect(pack.creatures).toMatchObject([{ slug: 'creature:mud-crab', level: 1, traits: ['animal'], armorClass: 16 }]);
    expect(pack.statistics).toMatchObject([
      { slug: 'statistic:swim-check', selector: 'skill:athletics', sources: page },
    ]);
    expect(pack.variantRules).toMatchObject([
      { slug: 'variant-rule:flat-bonus', rules: [{ key: 'ProficiencyBonus' }] },
    ]);
    expect(pack.otherEntries).toMatchObject([{ kind: 'language', slug: 'language:common' }]);
  });

  test('the proficiency bonus table comes from pack.json', () => {
    const table = { untrained: '0', trained: '2 + @level', expert: '4 + @level', master: '6', legendary: '8' };
    const pack = contentPackFromFiles({ ...packFile, proficiencyBonus: table }, []);
    expect(pack.proficiencyBonus).toStrictEqual(ProficiencyBonusTable.parse(table));
  });

  test('an entry filed under another pack is refused', () => {
    const stray = { ...language, id: idOf('language:common', 'player-core'), pack: 'player-core' };
    expect(() => contentPackFromFiles(packFile, [[stray]])).toThrow(
      'Entry "player-core/language:common" is filed under pack',
    );
  });

  test('an invalid entry or pack.json fails to parse', () => {
    expect(() => contentPackFromFiles(packFile, [[{ ...language, sources: [] }]])).toThrow();
    expect(() => contentPackFromFiles({ ...packFile, extra: true }, [])).toThrow();
  });

  test('two entries with one slug are refused; one name in two kinds is two slugs', () => {
    expect(() => contentPackFromFiles(packFile, [[ancestry], [ancestry]])).toThrow(
      'Slug "ancestry:lizardfolk" is used twice',
    );
    const lizardfolkLanguage = entry({ kind: 'language', slug: 'language:lizardfolk', data: {} });
    expect(contentPackFromFiles(packFile, [[ancestry], [lizardfolkLanguage]]).ancestries).toHaveLength(1);
  });
});

describe('variant rules that need a structural change', () => {
  const dualClass = entry({
    kind: 'variant-rule',
    slug: 'variant-rule:dual-class',
    data: { structure: ['secondClass'] },
  });

  test('the definition keeps the structure the entry declares', () => {
    const pack = contentPackFromFiles(packFile, [[dualClass]]);
    expect(pack.variantRules).toMatchObject([{ slug: 'variant-rule:dual-class', structure: ['secondClass'] }]);
  });

  test('a variant that is only rule elements declares none', () => {
    const pack = contentPackFromFiles(packFile, [[variantRule]]);
    expect(pack.variantRules[0]?.structure).toBeUndefined();
  });

  test('a structure the engine does not know is refused', () => {
    const unknown = entry({ kind: 'variant-rule', slug: 'variant-rule:odd', data: { structure: ['thirdClass'] } });
    expect(() => contentPackFromFiles(packFile, [[unknown]])).toThrow();
  });
});

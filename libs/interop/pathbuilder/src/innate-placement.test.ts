import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, ContentRegistry, ContentText } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { entryLookup } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';
import { placeInnate } from './innate-placement';
import type { ImportedCaster, ImportedSpellRank } from './read-spells';
import { SpellGapReason } from './spell-listing';
import type { SpellGap } from './spell-listing';

const pack = new ContentPackBuilder().withId('innate-import');
pack
  .withSpell('ill-omen', { rank: 1, traditions: [], traits: [] })
  .withSpell('bane', { rank: 1, traditions: [], traits: [] })
  .withSpell('slow', { rank: 3, traditions: [], traits: [] })
  .withSpell('oaken-resilience', { rank: 2, traditions: [], traits: [] });
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const GIFT = pack.idOf(ContentKind.ClassFeature, 'fey-gift');
const OAK = pack.idOf(ContentKind.ClassFeature, 'oak-gift');
const entry = (slug: string): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition: 'primal',
  attribute: 'cha',
  preparation: 'innate',
});
interface Gift {
  readonly spell: string;
  readonly rank: number;
  readonly predicate?: readonly string[];
}
const gives = (slug: string, { spell, rank, predicate }: Gift): object => ({
  key: 'InnateSpells',
  entry: slug,
  spells: [{ rank, spell: spellId(spell) }],
  ...(predicate === undefined ? {} : { predicate }),
});
pack
  .withClassFeature('fey-gift', {
    rules: [
      entry('fey-gift'),
      {
        key: 'ChoiceSet',
        flag: 'fey-gift',
        rollOption: 'fey-gift',
        choices: [
          { value: 'bluebird', label: 'Cursed Bluebird' },
          { value: 'gremlin', label: 'Gremlin' },
        ],
      },
      gives('fey-gift', { spell: 'ill-omen', rank: 1, predicate: ['fey-gift:bluebird'] }),
      gives('fey-gift', { spell: 'bane', rank: 1, predicate: ['fey-gift:gremlin'] }),
    ],
  })
  .withClassFeature('oak-gift', {
    rules: [entry('oak-gift'), gives('oak-gift', { spell: 'oaken-resilience', rank: 5 })],
  })
  .withClass('wizard', ['int'], {
    rules: [
      { key: 'GrantItem', item: GIFT },
      { key: 'GrantItem', item: OAK },
    ],
  });
const registry = new ContentRegistry();
registry.register(pack.build());
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const NAMES: readonly (readonly [string, string])[] = [
  ['ill-omen', 'Ill Omen'],
  ['bane', 'Bane'],
  ['slow', 'Slow'],
  ['oaken-resilience', 'Oaken Resilience'],
];
const lookup = entryLookup({
  [ImportKind.Spell]: NAMES.map(([slug, name]) => ({
    id: ContentId.parse(spellId(slug)),
    name: ContentText.parse(name),
  })),
});
const content = { slots, lookup };

function wizard(): CharacterDocument {
  return new CharacterBuilder().picking('class', pack.idOf(ContentKind.Class, 'wizard')).atLevel(5).build().document;
}

function innate(name: string, ...ranks: readonly ImportedSpellRank[]): ImportedCaster {
  return {
    name: PathbuilderName.parse(name),
    tradition: PathbuilderName.parse('primal'),
    preparation: undefined,
    innate: true,
    ranks,
    perDay: [],
  };
}

function ranked(at: ImportedSpellRank['rank'], ...spells: readonly string[]): ImportedSpellRank {
  return { rank: at, spells: spells.map((spell) => PathbuilderName.parse(spell)) };
}

function gap([caster, rank, name]: readonly [string, number, string], reason: SpellGapReason): SpellGap {
  return { caster: PathbuilderName.parse(caster), rank, name: PathbuilderName.parse(name), reason };
}

describe('placeInnate', () => {
  test('picks the feature choice whose option grants the spell the export lists', () => {
    const { choices, gaps } = placeInnate(wizard(), content, [innate('Fey Gift', ranked(1, 'Bane'))]);

    expect(Object.values(choices).map(String)).toStrictEqual(['gremlin']);
    expect(gaps).toStrictEqual([]);
  });

  test('picks nothing when the entry already grants the spells', () => {
    const { choices, gaps } = placeInnate(wizard(), content, [innate('Oak Gift', ranked(5, 'Oaken Resilience'))]);

    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([]);
  });

  test('takes a spell the entry casts heightened above the rank the export lists it at', () => {
    const { gaps } = placeInnate(wizard(), content, [innate('Oak Gift', ranked(2, 'Oaken Resilience'))]);

    expect(gaps).toStrictEqual([]);
  });

  test('a spell no option of the entry grants is a gap', () => {
    const { choices, gaps } = placeInnate(wizard(), content, [innate('Fey Gift', ranked(3, 'Slow'))]);

    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([gap(['Fey Gift', 3, 'Slow'], SpellGapReason.NotGranted)]);
  });

  test('a caster whose feat the character lacks has no entry', () => {
    const { gaps } = placeInnate(wizard(), content, [innate('Dream Magic', ranked(4, 'Slow'))]);

    expect(gaps).toStrictEqual([gap(['Dream Magic', 4, 'Slow'], SpellGapReason.NoEntry)]);
  });

  test('leaves the prepared and spontaneous casters to the slots', () => {
    const casting = { ...innate('Wizard', ranked(1, 'Bane')), innate: false };

    expect(placeInnate(wizard(), content, [casting])).toStrictEqual({ choices: {}, gaps: [] });
  });
});

import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, ContentRegistry, ContentText, SlotRank } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { entryLookup } from './content-lookup';
import mordredFixture from './fixtures/mordred.json';
import { placeFocus } from './focus-placement';
import { ImportKind, PathbuilderName } from './import-kind';
import { readPathbuilderExport } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';
import { SpellGapReason } from './spell-listing';
import type { SpellGap } from './spell-listing';

const read = readPathbuilderExport(mordredFixture);
if (!read.ok) {
  throw new Error('The Mordred fixture should be readable');
}
const mordred: PathbuilderImport = read.value;

const pack = new ContentPackBuilder().withId('focus-import');
pack
  .withSpell('lay-on-hands', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('read-fate', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('shield', { rank: 1, traditions: [], traits: ['cantrip', 'focus'] });
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const knows = (spell: string, predicate: readonly string[]): object => ({
  key: 'FocusSpells',
  entry: 'champion-focus',
  spells: [spellId(spell)],
  predicate,
});
pack
  .withClassFeature('devotion', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'champion-focus', tradition: 'divine', attribute: 'cha', preparation: 'focus' },
      {
        key: 'ChoiceSet',
        flag: 'devotion',
        rollOption: 'devotion',
        choices: [
          { value: 'hands', label: 'Lay on Hands' },
          { value: 'fate', label: 'Read Fate' },
        ],
      },
      knows('lay-on-hands', ['devotion:hands']),
      knows('read-fate', ['devotion:fate']),
      { key: 'FocusSpells', entry: 'champion-focus', spells: [spellId('shield')] },
    ],
  })
  .withClass('champion', ['str'], {
    rules: [{ key: 'GrantItem', item: pack.idOf(ContentKind.ClassFeature, 'devotion') }],
  })
  .withClass('wizard', ['int']);
const registry = new ContentRegistry();
registry.register(pack.build());
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const lookup = entryLookup({
  [ImportKind.Spell]: [
    ['lay-on-hands', 'Lay on Hands'],
    ['read-fate', 'Read Fate'],
    ['shield', 'Shield'],
  ].map(([slug, name]) => ({ id: ContentId.parse(spellId(slug ?? '')), name: ContentText.parse(name ?? '') })),
});
const content = { slots, lookup };

function character(className: string): CharacterDocument {
  return new CharacterBuilder().picking('class', pack.idOf(ContentKind.Class, className)).atLevel(5).build().document;
}

/** The export, listing these focus cantrips and spells for a tradition and attribute. */
function exporting(tradition: string, cantrips: readonly string[], spells: readonly string[]): PathbuilderImport {
  return {
    ...mordred,
    reported: {
      ...mordred.reported,
      focus: { [tradition]: { cha: { focusCantrips: cantrips, focusSpells: spells } } },
    },
  };
}

function gap(name: string, rank: SpellGap['rank'], reason: SpellGapReason): SpellGap {
  return { caster: PathbuilderName.parse('divine cha focus'), rank, name: PathbuilderName.parse(name), reason };
}

describe('placeFocus', () => {
  test('picks the feature choice whose option gives the focus spell the export lists', () => {
    const { choices, gaps } = placeFocus(character('champion'), content, exporting('divine', [], ['Read Fate']));

    expect(Object.values(choices).map(String)).toStrictEqual(['fate']);
    expect(gaps).toStrictEqual([]);
  });

  test('picks nothing when the focus entries already have what the export lists', () => {
    const { choices, gaps } = placeFocus(character('champion'), content, exporting('divine', ['Shield'], []));

    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([]);
  });

  test('a choice that holds one answer leaves the other spell not granted, at the rank every focus spell is cast at', () => {
    const { choices, gaps } = placeFocus(
      character('champion'),
      content,
      exporting('divine', [], ['Lay on Hands', 'Read Fate']),
    );

    expect(Object.values(choices).map(String)).toStrictEqual(['hands']);
    expect(gaps).toStrictEqual([gap('Read Fate', 3, SpellGapReason.NotGranted)]);
  });

  test('a focus cantrip the entry lacks is listed as a cantrip', () => {
    const { gaps } = placeFocus(character('champion'), content, exporting('divine', ['Shield'], []));

    expect(gaps).toStrictEqual([]);
    const wizard = placeFocus(character('wizard'), content, exporting('divine', ['Shield'], []));
    expect(wizard.gaps).toStrictEqual([gap('Shield', SlotRank.Cantrip, SpellGapReason.NoEntry)]);
  });

  test('a tradition and attribute the character has no focus entry for is no-entry', () => {
    const { gaps } = placeFocus(character('champion'), content, exporting('occult', [], ['Read Fate']));

    expect(gaps).toStrictEqual([
      { ...gap('Read Fate', 3, SpellGapReason.NoEntry), caster: PathbuilderName.parse('occult cha focus') },
    ]);
  });
});

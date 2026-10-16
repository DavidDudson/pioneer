import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants } from './class-build';
import { characterFocus } from './focus-spells';
import type { CharacterFocus } from './focus-spells';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { spellContent } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder } from './testing';

/**
 * A sorcerer and a fighter with the sorcerer archetype as the importer gives them (ADR-0050), shrunk to a demonic and
 * a draconic bloodline: the sorcerer's bloodline spells, Sorcerer Dedication's pick of a bloodline, and Basic
 * Bloodline Spell, which teaches its initial spell in the bloodline's tradition.
 */
const INITIAL = 'gluttons-jaws';
const ADVANCED = 'swamp-of-sloth';
const CLAWS = 'flurry-of-claws';
const BLOODLINES: Readonly<Record<string, readonly [tradition: string, spell: string]>> = {
  demonic: ['divine', INITIAL],
  'draconic-arcane': ['arcane', CLAWS],
  'draconic-primal': ['primal', CLAWS],
};
const CROSSBLOODED = { not: 'parent:granter:slug:crossblooded-evolution' };

const pack = new ContentPackBuilder().withId('bloodlines');
for (const spell of [INITIAL, ADVANCED, CLAWS]) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const focusEntry = (tradition: string, predicate: readonly unknown[]): object => ({
  key: 'SpellcastingEntry',
  slug: 'sorcerer-focus',
  tradition,
  attribute: 'cha',
  preparation: 'focus',
  predicate,
});
const focusSpells = (spell: string, predicate: readonly unknown[]): object => ({
  key: 'FocusSpells',
  entry: 'sorcerer-focus',
  spells: [spellId(spell)],
  predicate,
});

pack
  .withFeat('advanced-bloodline')
  .withClassFeature('bloodline-demonic', {
    rules: [
      focusEntry('divine', [CROSSBLOODED]),
      focusSpells(INITIAL, [CROSSBLOODED]),
      focusSpells(ADVANCED, [CROSSBLOODED, 'feat:advanced-bloodline']),
    ],
  })
  .withFeat('sorcerer-dedication', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'bloodline',
        rollOption: 'feat:sorcerer-dedication',
        choices: Object.keys(BLOODLINES).map((value) => ({ value, label: value })),
      },
    ],
  })
  .withFeat('basic-bloodline-spell', {
    rules: Object.entries(BLOODLINES).flatMap(([bloodline, [tradition, spell]]) => {
      const predicate = [`feat:sorcerer-dedication:${bloodline}`];
      return [focusEntry(tradition, predicate), focusSpells(spell, predicate)];
    }),
  });
const DEDICATION = pack.idOf(ContentKind.Feat, 'sorcerer-dedication');
const GRANTS = new Map([
  ['sorcerer', [pack.idOf(ContentKind.ClassFeature, 'bloodline-demonic')]],
  [
    'advanced-sorcerer',
    [pack.idOf(ContentKind.ClassFeature, 'bloodline-demonic'), pack.idOf(ContentKind.Feat, 'advanced-bloodline')],
  ],
  ['dedicated', [DEDICATION]],
  ['basic-bloodline-spell', [DEDICATION, pack.idOf(ContentKind.Feat, 'basic-bloodline-spell')]],
]);
for (const [name, items] of GRANTS) {
  pack.withClass(name, ['str'], { rules: items.map((item) => ({ key: 'GrantItem', item })) });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function focusOf(builder: CharacterBuilder): CharacterFocus {
  const { document } = builder.build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

/** A level 6 character of the class named, with the bloodline Sorcerer Dedication picked, if any. */
function character(name: string, bloodline = 'demonic'): CharacterBuilder {
  return new CharacterBuilder()
    .atLevel(6)
    .picking('class', pack.idOf(ContentKind.Class, name))
    .picking(`${DEDICATION}:0`, bloodline);
}

function spellsOf(builder: CharacterBuilder): string[] {
  return focusOf(builder).entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe('a sorcerer', () => {
  test("has its bloodline's initial spell, and its advanced spell with Advanced Bloodline", () => {
    expect(spellsOf(character('sorcerer'))).toEqual([spellId(INITIAL)]);
    expect(spellsOf(character('advanced-sorcerer'))).toEqual([spellId(INITIAL), spellId(ADVANCED)]);
  });
});

describe('a character with Sorcerer Dedication', () => {
  test('has no bloodline spell until Basic Bloodline Spell gives the initial one', () => {
    const basic = focusOf(character('basic-bloodline-spell'));

    expect(focusOf(character('dedicated')).entries).toEqual([]);
    expect(spellsOf(character('basic-bloodline-spell'))).toEqual([spellId(INITIAL)]);
    expect(basic.pool).toBe(1);
  });

  test.each([
    ['demonic', 'divine'],
    ['draconic-arcane', 'arcane'],
    ['draconic-primal', 'primal'],
  ])("a %s bloodline's focus entry is %s", (bloodline, tradition) => {
    const { entries } = focusOf(character('basic-bloodline-spell', bloodline));

    expect(entries.map((each) => each.entry.tradition)).toEqual([tradition]);
  });
});

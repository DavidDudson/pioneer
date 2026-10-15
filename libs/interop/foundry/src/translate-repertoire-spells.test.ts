import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import {
  BLOODLINE_DEMONIC,
  BLOODLINE_DRACONIC,
  BLOODLINE_ELEMENTAL,
  MYSTERY_FLAMES,
  ORACLE_SPELLCASTING,
  SORCERER_SPELLCASTING,
} from './testing/spellcasting-fixtures';

const { ChoiceSet, RepertoireSpells, SpellcastingEntry, SpellSlots } = RuleElementKey;

/** A feature, its entry slug, and the spells its gifts resolve against, by name. */
interface Imported {
  readonly slug: string;
  readonly fixture: DocumentFixture;
  readonly spells: readonly string[];
}

/** A spell document for each of `names`. */
function spellsNamed(names: readonly string[]): DocumentFixture[] {
  return names.map((name, index) => ({ id: `sPeLlGiFt${String(index).padStart(7, '0')}`, name, type: 'spell' }));
}

/** The rule elements of `key` the feature gains when imported with its spells. */
function keyed(key: string, { slug, fixture, spells }: Imported): Record<string, unknown>[] {
  return rulesIn(translate([fixture, ...spellsNamed(spells)]), slug).filter(
    (rule): rule is Record<string, unknown> =>
      typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

const spell = (slug: string): string => idOf(`spell:${slug}`);

const DEMONIC: Imported = {
  slug: 'bloodline-demonic',
  fixture: BLOODLINE_DEMONIC,
  spells: [
    'Caustic Blast',
    'Fear',
    'Enlarge',
    'Slow',
    'Divine Wrath',
    'Blister',
    'Disintegrate',
    'Divine Decree',
    'Canticle of Everlasting Grief',
    'Implosion',
  ],
};

const DRACONIC: Imported = {
  slug: 'bloodline-draconic',
  fixture: BLOODLINE_DRACONIC,
  spells: ['Shield', 'Fear', 'Haste', 'Fly', 'Dragon Form', 'Mask of Terror', 'Overwhelming Presence', 'Augury'],
};

const ELEMENTAL: Imported = {
  slug: 'bloodline-elemental',
  fixture: BLOODLINE_ELEMENTAL,
  spells: ['Resist Energy', 'Ignition', 'Breathe Fire', 'Fireball', 'Tree of Seasons'],
};

const FLAMES: Imported = {
  slug: 'flames',
  fixture: MYSTERY_FLAMES,
  spells: ['Ignition', 'Breathe Fire', 'Blazing Bolt', 'Fireball'],
};

describe('translateKindData: repertoire spells', () => {
  test("a bloodline gives the sorcerer's entry in its tradition and its sorcerous gifts, a cantrip then each rank", () => {
    expect(keyed(SpellcastingEntry, DEMONIC)).toEqual([
      { key: SpellcastingEntry, slug: 'sorcerer', tradition: 'divine', attribute: 'cha', preparation: 'spontaneous' },
    ]);
    const [gifts] = keyed(RepertoireSpells, DEMONIC);
    expect(gifts).toMatchObject({ entry: 'sorcerer' });
    expect(gifts?.['spells']).toEqual([
      { rank: 'cantrip', spell: spell('caustic-blast') },
      { rank: 1, spell: spell('fear') },
      { rank: 2, spell: spell('enlarge') },
      { rank: 3, spell: spell('slow') },
      { rank: 4, spell: spell('divine-wrath') },
      { rank: 5, spell: spell('blister') },
      { rank: 6, spell: spell('disintegrate') },
      { rank: 7, spell: spell('divine-decree') },
      { rank: 8, spell: spell('canticle-of-everlasting-grief') },
      { rank: 9, spell: spell('implosion') },
    ]);
  });

  test("a draconic bloodline's exemplar picks the tradition and the 2nd, 5th and 8th gifts", () => {
    const [choice] = keyed(ChoiceSet, DRACONIC);
    const entries = keyed(SpellcastingEntry, DRACONIC);
    const gifts = keyed(RepertoireSpells, DRACONIC);
    const ofDivine = gifts.find(({ predicate }) => String(predicate) === 'draconic-exemplar:divine');

    expect(choice).toMatchObject({ flag: 'draconic-exemplar', rollOption: 'draconic-exemplar' });
    expect(entries.map(({ tradition, predicate }) => [tradition, predicate])).toEqual([
      ['arcane', ['draconic-exemplar:arcane']],
      ['divine', ['draconic-exemplar:divine']],
      ['occult', ['draconic-exemplar:occult']],
      ['primal', ['draconic-exemplar:primal']],
    ]);
    expect(gifts.find(({ predicate }) => predicate === undefined)?.['spells']).toContainEqual({
      rank: 3,
      spell: spell('haste'),
    });
    expect(ofDivine?.['spells']).toEqual([{ rank: 2, spell: spell('augury') }]);
  });

  test('a draconic exemplar trains its skill unless Crossblooded Evolution borrows the bloodline', () => {
    const skills = keyed(RuleElementKey.Proficiency, DRACONIC);
    const not = { not: 'parent:granter:slug:crossblooded-evolution' };

    expect(skills.map(({ selector, rank, predicate }) => [selector, rank, predicate])).toEqual([
      ['skill:arcana', 'trained', ['draconic-exemplar:arcane', not]],
      ['skill:religion', 'trained', ['draconic-exemplar:divine', not]],
      ['skill:occultism', 'trained', ['draconic-exemplar:occult', not]],
      ['skill:nature', 'trained', ['draconic-exemplar:primal', not]],
    ]);
  });

  test("an elemental bloodline's influence picks its cantrip, 1st, 3rd and 6th gifts, in the primal tradition", () => {
    const [entry] = keyed(SpellcastingEntry, ELEMENTAL);
    const [choice] = keyed(ChoiceSet, ELEMENTAL);
    const gifts = keyed(RepertoireSpells, ELEMENTAL);
    const ofFire = gifts.find(({ predicate }) => String(predicate) === 'elemental-influence:fire');

    expect(entry).toMatchObject({ slug: 'sorcerer', tradition: 'primal', preparation: 'spontaneous' });
    expect(choice).toMatchObject({ flag: 'elemental-influence' });
    expect(ofFire?.['spells']).toEqual([
      { rank: 'cantrip', spell: spell('ignition') },
      { rank: 1, spell: spell('breathe-fire') },
      { rank: 3, spell: spell('fireball') },
      { rank: 6, spell: spell('tree-of-seasons') },
    ]);
  });

  test("a mystery gives the oracle its granted spells and no entry: the oracle's own is Oracle Spellcasting's", () => {
    expect(keyed(SpellcastingEntry, FLAMES)).toEqual([]);
    expect(keyed(RepertoireSpells, FLAMES)).toEqual([
      {
        key: RepertoireSpells,
        entry: 'oracle',
        spells: [
          { rank: 'cantrip', spell: spell('ignition') },
          { rank: 1, spell: spell('breathe-fire') },
          { rank: 2, spell: spell('blazing-bolt') },
          { rank: 3, spell: spell('fireball') },
        ],
      },
    ]);
  });

  test('a gift whose spell is not imported is left out, and a bloodline with none gives no element', () => {
    expect(keyed(RepertoireSpells, { ...DEMONIC, spells: ['Fear'] })[0]?.['spells']).toEqual([
      { rank: 1, spell: spell('fear') },
    ]);
    expect(keyed(RepertoireSpells, { ...DEMONIC, spells: [] })).toEqual([]);
  });

  test("the oracle's entry is divine and spontaneous, and sorcerer and oracle have three slots of a rank, then four", () => {
    const [oracle] = keyed(SpellcastingEntry, {
      slug: 'oracle-spellcasting',
      fixture: ORACLE_SPELLCASTING,
      spells: [],
    });
    const slots = keyed(SpellSlots, { slug: 'sorcerer-spellcasting', fixture: SORCERER_SPELLCASTING, spells: [] });
    const rankOne = slots.filter(({ rank }) => rank === 1).map(({ value, predicate }) => [value, predicate]);

    expect(oracle).toMatchObject({ slug: 'oracle', tradition: 'divine', attribute: 'cha', preparation: 'spontaneous' });
    expect(rankOne).toEqual([
      [3, undefined],
      [1, [{ gte: ['self:level', 2] }]],
    ]);
    expect(slots.find(({ rank }) => rank === 'cantrip')).toMatchObject({ entry: 'sorcerer', value: 5 });
  });
});

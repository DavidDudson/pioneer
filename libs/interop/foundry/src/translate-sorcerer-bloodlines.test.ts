import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { BASIC_BLOODLINE_SPELL, SORCERER_DEDICATION } from './testing/archetype-focus-fixtures';
import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { BLOODLINE_DEMONIC, BLOODLINE_DRACONIC } from './testing/spellcasting-fixtures';
import { BLOODLINES } from './translate-sorcerer-bloodlines';

const { ChoiceSet, FocusSpells, SpellcastingEntry } = RuleElementKey;

const CROSSBLOODED = { not: 'parent:granter:slug:crossblooded-evolution' };
const spell = (slug: string): string => idOf(`spell:${slug}`);
const entry = (tradition: string, predicate: readonly unknown[]): Record<string, unknown> => ({
  key: SpellcastingEntry,
  slug: 'sorcerer-focus',
  tradition,
  attribute: 'cha',
  preparation: 'focus',
  predicate,
});

function keyed(key: string, name: string, fixture: DocumentFixture): Record<string, unknown>[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule): rule is Record<string, unknown> =>
      typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

/** The focus entries a feature gains, not the sorcerer's own. */
function focusEntries(name: string, fixture: DocumentFixture): Record<string, unknown>[] {
  return keyed(SpellcastingEntry, name, fixture).filter(({ preparation }) => preparation === 'focus');
}

describe('translateKindData: sorcerer bloodline spells', () => {
  test("a bloodline gives its tradition's charisma focus entry, and its initial, advanced and greater spells", () => {
    expect(focusEntries('bloodline-demonic', BLOODLINE_DEMONIC)).toEqual([entry('divine', [CROSSBLOODED])]);
    expect(keyed(FocusSpells, 'bloodline-demonic', BLOODLINE_DEMONIC)).toEqual([
      { key: FocusSpells, entry: 'sorcerer-focus', spells: [spell('gluttons-jaws')], predicate: [CROSSBLOODED] },
      {
        key: FocusSpells,
        entry: 'sorcerer-focus',
        spells: [spell('swamp-of-sloth')],
        predicate: [CROSSBLOODED, 'feat:advanced-bloodline'],
      },
      {
        key: FocusSpells,
        entry: 'sorcerer-focus',
        spells: [spell('chthonian-wrath')],
        predicate: [CROSSBLOODED, 'feat:greater-bloodline'],
      },
    ]);
  });

  test("a draconic bloodline's tradition is its exemplar's", () => {
    expect(focusEntries('bloodline-draconic', BLOODLINE_DRACONIC)).toEqual(
      ['arcane', 'divine', 'occult', 'primal'].map((tradition) =>
        entry(tradition, [CROSSBLOODED, `draconic-exemplar:${tradition}`]),
      ),
    );
  });

  test('every bloodline is named once, with three distinct spells', () => {
    const slugs = BLOODLINES.map(({ slug }) => slug);
    const spells = BLOODLINES.flatMap(({ initial, advanced, greater }) => [initial, advanced, greater]);

    expect(new Set(slugs).size).toBe(BLOODLINES.length);
    expect(new Set(spells).size).toBe(BLOODLINES.length * 3);
  });

  test('Sorcerer Dedication picks a bloodline, a draconic one with its exemplar, and grants nothing', () => {
    const [choice] = keyed(ChoiceSet, 'sorcerer-dedication', SORCERER_DEDICATION);

    expect(choice).toMatchObject({ flag: 'bloodline', rollOption: 'feat:sorcerer-dedication' });
    expect(choice?.['choices']).toContainEqual({ value: 'demonic', label: 'Demonic' });
    expect(choice?.['choices']).toContainEqual({ value: 'draconic-primal', label: 'Draconic (Primal)' });
    expect(choice?.['choices']).not.toContainEqual({ value: 'draconic', label: 'Draconic' });
    expect(keyed(FocusSpells, 'sorcerer-dedication', SORCERER_DEDICATION)).toEqual([]);
  });

  test("Basic Bloodline Spell gives the initial spell of the dedication's bloodline, in its tradition", () => {
    const predicate = ['feat:sorcerer-dedication:draconic-divine'];

    expect(focusEntries('basic-bloodline-spell', BASIC_BLOODLINE_SPELL)).toContainEqual(entry('divine', predicate));
    expect(keyed(FocusSpells, 'basic-bloodline-spell', BASIC_BLOODLINE_SPELL)).toContainEqual({
      key: FocusSpells,
      entry: 'sorcerer-focus',
      spells: [spell('flurry-of-claws')],
      predicate,
    });
  });
});

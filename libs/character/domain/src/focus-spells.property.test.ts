import { describe, expect, test } from 'bun:test';

import { spellcastingInPlay } from '@pioneer/rules/engine';
import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { inPlay } from '@pioneer/rules/engine/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentKind, ContentRegistry, FOCUS_POOL_MAX } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, property, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { CharacterLevel } from './character-fields';
import { characterFocus } from './focus-spells';
import { spellContent } from './spell-content';

/** Four focus spells and two focus cantrips the generated entries draw from. */
const SPELLS = ['one', 'two', 'three', 'four'];
const CANTRIPS = ['anthem', 'evil-eye'];
const pack = new ContentPackBuilder().withId('focus-properties');
for (const name of SPELLS) {
  pack.withSpell(name, { rank: 1, traditions: [], traits: ['focus'] });
}
for (const name of CANTRIPS) {
  pack.withSpell(name, { rank: 1, traditions: [], traits: ['cantrip', 'hex'] });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content = spellContent(registry);
const idOf = (name: string): string => pack.idOf(ContentKind.Spell, name);
const CANTRIP_IDS: ReadonlySet<string> = new Set(CANTRIPS.map((name) => idOf(name)));

/** A focus entry and the spells its `FocusSpells` elements name, one element per list. */
interface FocusEntryCase {
  readonly slug: string;
  readonly grants: readonly (readonly string[])[];
}

const grant: Arbitrary<string[]> = subarray(
  [...SPELLS, ...CANTRIPS].map((name) => idOf(name)),
  { minLength: 1 },
);
const focusEntries: Arbitrary<FocusEntryCase[]> = subarray(['bard-focus', 'cleric-focus', 'witch-focus']).chain(
  (slugs) =>
    tuple(...slugs.map(() => array(grant, { minLength: 1, maxLength: 3 }))).map((grants) =>
      slugs.map((slug, index): FocusEntryCase => ({ slug, grants: grants[index] ?? [] })),
    ),
);

function entriesOf(cases: readonly FocusEntryCase[]): readonly SpellcastingInPlay[] {
  const elements = cases.flatMap(({ slug, grants }) => [
    { key: 'SpellcastingEntry', slug, tradition: 'occult', attribute: 'cha', preparation: 'focus' },
    ...grants.map((spells) => ({ key: 'FocusSpells', entry: slug, spells })),
  ]);
  const rules = elements.map((element, rule) => inPlay(element, 'feature', { rule }));
  return spellcastingInPlay({ rules, facts: new PredicateFacts([], CORE_NAMESPACES) });
}

const LEVEL = CharacterLevel.parse(1);

describe('characterFocus (properties)', () => {
  test('the pool is one point per distinct focus spell that is not a cantrip, at most 3', () => {
    assert(
      property(focusEntries, (cases) => {
        const named = new Set(cases.flatMap(({ grants }) => grants.flat()));
        const points = [...named].filter((spell) => !CANTRIP_IDS.has(spell)).length;

        const { pool } = characterFocus(entriesOf(cases), content, LEVEL);

        expect(Number(pool)).toBe(Math.min(points, FOCUS_POOL_MAX));
      }),
    );
  });

  test('each entry knows the spells its elements name, each once, in the order they first name them', () => {
    assert(
      property(focusEntries, (cases) => {
        const known = characterFocus(entriesOf(cases), content, LEVEL).entries;

        for (const { slug, grants } of cases) {
          const expected = [...new Set(grants.flat())];
          const entry = known.find(({ entry: each }) => String(each.slug) === slug);
          expect(entry?.spells.map(({ id }) => String(id))).toStrictEqual(expected);
        }
      }),
    );
  });
});

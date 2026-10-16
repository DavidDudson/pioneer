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
 * A fighter with the beastmaster archetype as the importer gives it (ADR-0050): Beastmaster's Trance gives the focus
 * spell Beastmaster Trance in the beastmaster's primal charisma entry, and a Focus Point with it.
 */
const OWN = ['order-spell', 'heal-animal', 'untamed-shift'];
const entry = (slug: string, tradition: string, attribute: string): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition,
  attribute,
  preparation: 'focus',
});

const pack = new ContentPackBuilder().withId('beastmaster');
for (const spell of ['beastmaster-trance', ...OWN]) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);

pack
  .withFeat('beastmasters-trance', {
    rules: [
      entry('beastmaster-focus', 'primal', 'cha'),
      { key: 'FocusSpells', entry: 'beastmaster-focus', spells: [spellId('beastmaster-trance')] },
    ],
  })
  .withClassFeature('druid-orders', {
    rules: [
      entry('druid-focus', 'primal', 'wis'),
      { key: 'FocusSpells', entry: 'druid-focus', spells: OWN.map((spell) => spellId(spell)) },
    ],
  });
const TRANCE = pack.idOf(ContentKind.Feat, 'beastmasters-trance');
const ORDERS = pack.idOf(ContentKind.ClassFeature, 'druid-orders');
const GRANTS = new Map([
  ['plain', []],
  ['trance', [TRANCE]],
  ['druid', [ORDERS, TRANCE]],
]);
for (const [name, items] of GRANTS) {
  pack.withClass(name, ['str'], { rules: items.map((item) => ({ key: 'GrantItem', item })) });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function focusOf(name: string): CharacterFocus {
  const { document } = new CharacterBuilder().atLevel(6).picking('class', pack.idOf(ContentKind.Class, name)).build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

function spellsOf(name: string): string[] {
  return focusOf(name).entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe("a character with Beastmaster's Trance", () => {
  test('has the focus spell Beastmaster Trance and a Focus Point with it', () => {
    expect(spellsOf('plain')).toEqual([]);
    expect(spellsOf('trance')).toEqual([spellId('beastmaster-trance')]);
    expect(focusOf('trance').pool).toBe(1);
  });

  test("shares one focus pool with the class's own, up to 3", () => {
    expect(spellsOf('druid')).toHaveLength(4);
    expect(focusOf('druid').pool).toBe(3);
  });
});

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
 * An oracle and a fighter with the oracle archetype as the importer gives them (ADR-0050), shrunk to two mysteries: the
 * oracle's revelation spells, Oracle Dedication's pick of a mystery, and First Revelation, which teaches its initial
 * spell.
 */
const MYSTERIES: Readonly<Record<string, readonly [initial: string, advanced: string]>> = {
  battle: ['weapon-trance', 'battlefield-persistence'],
  flames: ['incendiary-aura', 'whirling-flames'],
};
const ORACLE_ENTRY = {
  key: 'SpellcastingEntry',
  slug: 'oracle-focus',
  tradition: 'divine',
  attribute: 'cha',
  preparation: 'focus',
};

const pack = new ContentPackBuilder().withId('mysteries');
for (const spell of Object.values(MYSTERIES).flat()) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const focusSpells = (spell: string, predicate?: readonly unknown[]): object => ({
  key: 'FocusSpells',
  entry: 'oracle-focus',
  spells: [spellId(spell)],
  ...(predicate === undefined ? {} : { predicate }),
});

pack.withFeat('advanced-revelation');
for (const [name, [initial, advanced]] of Object.entries(MYSTERIES)) {
  pack.withClassFeature(name, {
    rules: [ORACLE_ENTRY, focusSpells(initial), focusSpells(advanced, ['feat:advanced-revelation'])],
  });
}
pack
  .withFeat('oracle-dedication', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'mystery',
        rollOption: 'feat:oracle-dedication',
        choices: Object.keys(MYSTERIES).map((value) => ({ value, label: value })),
      },
    ],
  })
  .withFeat('first-revelation', {
    rules: [
      ORACLE_ENTRY,
      ...Object.entries(MYSTERIES).map(([mystery, [initial]]) =>
        focusSpells(initial, [`feat:oracle-dedication:${mystery}`]),
      ),
    ],
  });
const DEDICATION = pack.idOf(ContentKind.Feat, 'oracle-dedication');
const FLAMES = pack.idOf(ContentKind.ClassFeature, 'flames');
const ADVANCED = pack.idOf(ContentKind.Feat, 'advanced-revelation');
const GRANTS = new Map([
  ['oracle', [FLAMES]],
  ['advanced-oracle', [FLAMES, ADVANCED]],
  ['dedicated', [DEDICATION]],
  ['first-revelation', [DEDICATION, pack.idOf(ContentKind.Feat, 'first-revelation')]],
]);
for (const [name, items] of GRANTS) {
  pack.withClass(name, ['str'], { rules: items.map((item) => ({ key: 'GrantItem', item })) });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function focusOf(name: string, mystery = 'battle'): CharacterFocus {
  const { document } = new CharacterBuilder()
    .atLevel(6)
    .picking('class', pack.idOf(ContentKind.Class, name))
    .picking(`${DEDICATION}:0`, mystery)
    .build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

function spellsOf(name: string, mystery?: string): string[] {
  return focusOf(name, mystery).entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe('an oracle', () => {
  test("has its mystery's initial spell, and its advanced spell with Advanced Revelation", () => {
    expect(spellsOf('oracle')).toEqual([spellId('incendiary-aura')]);
    expect(spellsOf('advanced-oracle')).toEqual([spellId('incendiary-aura'), spellId('whirling-flames')]);
  });
});

describe('a character with Oracle Dedication', () => {
  test('has no revelation spell until First Revelation gives the initial one of its mystery', () => {
    expect(spellsOf('dedicated')).toEqual([]);
    expect(spellsOf('first-revelation', 'battle')).toEqual([spellId('weapon-trance')]);
    expect(spellsOf('first-revelation', 'flames')).toEqual([spellId('incendiary-aura')]);
    expect(Number(focusOf('first-revelation').pool)).toBe(1);
  });
});

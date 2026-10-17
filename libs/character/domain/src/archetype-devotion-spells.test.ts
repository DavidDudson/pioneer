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

/** A fighter with the champion archetypes as the importer gives them (ADR-0050): the devotion spells they grant. */
const CHAMPION_FOCUS = {
  key: 'SpellcastingEntry',
  slug: 'champion-focus',
  tradition: 'divine',
  attribute: 'cha',
  preparation: 'focus',
};
const DEVOTION = ['shields-of-the-spirit', 'lay-on-hands', 'touch-of-the-void'];

const pack = new ContentPackBuilder().withId('devotion');
for (const spell of [...DEVOTION, 'protectors-sacrifice']) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const grant = (spell: string, predicate?: readonly unknown[]): object => ({
  key: 'FocusSpells',
  entry: 'champion-focus',
  spells: [spellId(spell)],
  ...(predicate === undefined ? {} : { predicate }),
});

pack
  .withFeat('devout-magic', {
    rules: [
      CHAMPION_FOCUS,
      {
        key: 'ChoiceSet',
        flag: 'devout-magic',
        rollOption: 'devout-magic',
        choices: DEVOTION.map((value) => ({ value, label: value })),
      },
      ...DEVOTION.map((spell) => grant(spell, [`devout-magic:${spell}`])),
    ],
  })
  .withFeat('blessed-one-dedication', { rules: [CHAMPION_FOCUS, grant('lay-on-hands')] })
  .withFeat('blessed-sacrifice', { rules: [CHAMPION_FOCUS, grant('protectors-sacrifice')] });
const FEATS = new Map([
  ['plain', []],
  ['devout-magic', ['devout-magic']],
  ['blessed-one', ['blessed-one-dedication']],
  ['both', ['blessed-one-dedication', 'blessed-sacrifice']],
]);
for (const [name, feats] of FEATS) {
  pack.withClass(name, ['str'], {
    rules: feats.map((feat) => ({ key: 'GrantItem', item: pack.idOf(ContentKind.Feat, feat) })),
  });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const DEVOUT_PICK = `${pack.idOf(ContentKind.Feat, 'devout-magic')}:1`;

function focusOf(feats: string, picks: Readonly<Record<string, string>> = {}): CharacterFocus {
  let builder = new CharacterBuilder().atLevel(4).picking('class', pack.idOf(ContentKind.Class, feats));
  for (const [slot, pick] of Object.entries(picks)) {
    builder = builder.picking(slot, pick);
  }
  const { document } = builder.build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

function spellsOf(focus: CharacterFocus): string[] {
  return focus.entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe('a character with champion archetype devotion spells', () => {
  test('Devout Magic grants the devotion spell picked', () => {
    expect(spellsOf(focusOf('plain'))).toEqual([]);
    expect(spellsOf(focusOf('devout-magic', { [DEVOUT_PICK]: 'lay-on-hands' }))).toEqual([spellId('lay-on-hands')]);
  });

  test('Blessed One Dedication and Blessed Sacrifice share one focus pool of two', () => {
    const both = focusOf('both');

    expect(spellsOf(focusOf('blessed-one'))).toEqual([spellId('lay-on-hands')]);
    expect(spellsOf(both)).toEqual([spellId('lay-on-hands'), spellId('protectors-sacrifice')]);
    expect(Number(both.pool)).toBe(2);
  });
});

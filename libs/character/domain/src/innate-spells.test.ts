import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants } from './class-build';
import { characterInnate } from './innate-spells';
import type { InnateEntrySpells } from './innate-spells';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { spellContent } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder } from './testing';

const UNLOADED = '00000000-0000-4000-8000-0000000000f0';

const heritage = new ContentPackBuilder().withId('innate');
heritage
  .withSpell('ill-omen', { rank: 1, traditions: [], traits: [] })
  .withSpell('daze', { rank: 1, traditions: [], traits: ['cantrip'] });
const spellId = (name: string): string => heritage.idOf(ContentKind.Spell, name);
const GRANTED = heritage.idOf(ContentKind.ClassFeature, 'fey-gift');
heritage
  .withClassFeature('fey-gift', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'fey-gift', tradition: 'primal', attribute: 'cha', preparation: 'innate' },
      {
        key: 'InnateSpells',
        entry: 'fey-gift',
        spells: [
          { rank: 'cantrip', spell: spellId('daze') },
          { rank: 1, spell: spellId('ill-omen') },
          { rank: 4, spell: UNLOADED },
        ],
      },
    ],
  })
  .withClass('wizard', ['int'], { rules: [{ key: 'GrantItem', item: GRANTED }] });
const registry = new ContentRegistry();
registry.register(heritage.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function innateOf(level: number): readonly InnateEntrySpells[] {
  const { document } = new CharacterBuilder()
    .atLevel(level)
    .picking('class', heritage.idOf(ContentKind.Class, 'wizard'))
    .build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterInnate(entries, spellContent(registry), document.level);
}

describe('characterInnate', () => {
  test('lists an innate entry with its spells at the rank named, a cantrip at half the level rounded up', () => {
    const [fey] = innateOf(7);

    expect(String(fey?.entry.slug)).toBe('fey-gift');
    expect(fey?.spells.map(({ spell, rank }) => [String(spell.id), Number(rank)])).toStrictEqual([
      [spellId('daze'), 4],
      [spellId('ill-omen'), 1],
    ]);
  });

  test('leaves out a spell whose content is not loaded', () => {
    const ids = innateOf(3).flatMap(({ spells }) => spells.map(({ spell }) => String(spell.id)));

    expect(ids).not.toContain(UNLOADED);
  });

  test('keeps an innate entry that has no spells yet', () => {
    expect(innateOf(1)).toHaveLength(1);
  });
});

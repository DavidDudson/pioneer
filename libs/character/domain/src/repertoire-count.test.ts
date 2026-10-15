import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import type { PreparedSlot } from './prepared-spells';
import { preparedSlots } from './prepared-spells';
import { preparedReads, slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

/**
 * A sorcerer as the importer gives one (ADR-0063), shrunk: slots by level, a 10th-rank slot from 19th level, a count of
 * two 10th-rank repertoire spells from 19th, a second 10th-rank slot from 20th (a slot and no spell), and a count of
 * one extra 1st-rank spell from 5th.
 */
const pack = new ContentPackBuilder().withId('sorcerer-count');
for (const [name, rank] of [
  ['first-spell', 1],
  ['second-spell', 2],
  ['tenth-spell', 10],
  ['other-tenth-spell', 10],
] as const) {
  pack.withSpell(name, { rank, traditions: ['occult'] });
}
const fromLevel = (level: number): object => ({ predicate: [{ gte: ['self:level', level] }] });
const slots = (rank: number, value: number, level = 1): object => ({
  key: 'SpellSlots',
  entry: 'sorcerer',
  rank,
  value,
  ...(level > 1 ? fromLevel(level) : {}),
});
const count = (rank: number, value: number, level: number): object => ({
  key: 'RepertoireCount',
  entry: 'sorcerer',
  rank,
  value,
  ...fromLevel(level),
});
const SPELLCASTING = pack.idOf(ContentKind.ClassFeature, 'sorcerer-spellcasting');
pack
  .withClassFeature('sorcerer-spellcasting', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'sorcerer', tradition: 'occult', attribute: 'cha', preparation: 'spontaneous' },
      slots(1, 2),
      slots(10, 1, 19),
      slots(10, 1, 20),
      count(10, 2, 19),
      count(1, 1, 5),
    ],
  })
  .withClass('sorcerer', ['cha'], { rules: [{ key: 'GrantItem', item: SPELLCASTING }] });
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function slotsOf(level: number): PreparedSlot[] {
  const document: CharacterDocument = new CharacterBuilder()
    .atLevel(level)
    .picking('class', pack.idOf(ContentKind.Class, 'sorcerer'))
    .picking('boost:1:class:0', 'cha')
    .build().document;
  return preparedSlots(document, preparedReads(document, content));
}

function keysOf(level: number, prefix: string): string[] {
  return slotsOf(level)
    .map((slot) => String(slot.key))
    .filter((key) => key.startsWith(prefix));
}

describe('repertoire count', () => {
  test('a 10th-rank count gives that many repertoire spells for its single slot', () => {
    expect(keysOf(19, 'repertoire:sorcerer:10:')).toStrictEqual([
      'repertoire:sorcerer:10:0',
      'repertoire:sorcerer:10:1',
    ]);
  });

  test('a second 10th-rank slot adds a slot, not a repertoire spell', () => {
    expect(keysOf(20, 'repertoire:sorcerer:10:')).toHaveLength(2);
  });

  test('without a count, 10th-rank slots give no repertoire spell', () => {
    expect(keysOf(18, 'repertoire:sorcerer:10:')).toStrictEqual([]);
  });

  test('a 10th-rank repertoire slot offers 10th-rank spells of the tradition, never a lower spell heightened', () => {
    const slot = slotsOf(19).find((each) => String(each.key) === 'repertoire:sorcerer:10:0');

    expect(slot?.options.map((each) => String(each.name)).toSorted()).toStrictEqual([
      'Other-tenth-spell',
      'Tenth-spell',
    ]);
  });

  test('below 10th rank a count adds to the repertoire on top of the slots', () => {
    expect(keysOf(4, 'repertoire:sorcerer:1:')).toHaveLength(2);
    expect(keysOf(5, 'repertoire:sorcerer:1:')).toHaveLength(3);
  });
});

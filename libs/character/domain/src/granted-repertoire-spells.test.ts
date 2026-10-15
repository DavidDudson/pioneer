import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import { characterSlots } from './character-slot-status';
import type { PreparedSlot } from './prepared-spells';
import { preparedSlots } from './prepared-spells';
import { signatureSlots } from './signature-spells';
import { preparedReads, slotContent, slotRefusal } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

/**
 * A sorcerer as the importer gives one (ADR-0062), shrunk: a spontaneous entry with slots by level, signature spells, and
 * a bloodline whose gifts are a cantrip and a spell of each of the first two ranks.
 */
const pack = new ContentPackBuilder().withId('sorcerer');
for (const [name, rank] of [
  ['gift-cantrip', 1],
  ['other-cantrip', 1],
  ['gift-first', 1],
  ['other-first', 1],
  ['gift-second', 2],
] as const) {
  pack.withSpell(name, {
    rank,
    traditions: ['occult'],
    traits: name.endsWith('cantrip') ? ['cantrip'] : [],
  });
}
const spell = (name: string): ContentId => ContentId.parse(pack.idOf(ContentKind.Spell, name));
const slots = (rank: string | number, value: number, level = 1): object => ({
  key: 'SpellSlots',
  entry: 'sorcerer',
  rank,
  value,
  ...(level > 1 ? { predicate: [{ gte: ['self:level', level] }] } : {}),
});
const SPELLCASTING = pack.idOf(ContentKind.ClassFeature, 'sorcerer-spellcasting');
const BLOODLINE = pack.idOf(ContentKind.ClassFeature, 'bloodline-test');
pack
  .withClassFeature('sorcerer-spellcasting', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'sorcerer', tradition: 'occult', attribute: 'cha', preparation: 'spontaneous' },
      { key: 'SignatureSpells', entry: 'sorcerer' },
      slots('cantrip', 2),
      slots(1, 3),
      slots(2, 3, 3),
    ],
  })
  .withClassFeature('bloodline-test', {
    rules: [
      {
        key: 'RepertoireSpells',
        entry: 'sorcerer',
        spells: [
          { rank: 'cantrip', spell: spell('gift-cantrip') },
          { rank: 1, spell: spell('gift-first') },
          { rank: 2, spell: spell('gift-second') },
        ],
      },
    ],
  })
  .withClass('sorcerer', ['cha'], {
    rules: [
      { key: 'GrantItem', item: SPELLCASTING },
      { key: 'GrantItem', item: BLOODLINE },
    ],
  });
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function sorcerer(level: number, picks: Readonly<Record<string, string>> = {}): CharacterDocument {
  let builder = new CharacterBuilder().atLevel(level).picking('class', pack.idOf(ContentKind.Class, 'sorcerer'));
  builder = builder.picking('boost:1:class:0', 'cha');
  for (const [key, value] of Object.entries(picks)) {
    builder = builder.picking(key, spell(value));
  }
  return builder.build().document;
}

function slotsOf(level: number, picks?: Readonly<Record<string, string>>): PreparedSlot[] {
  const document = sorcerer(level, picks);
  return preparedSlots(document, preparedReads(document, content));
}

/** Why the first 1st-rank repertoire slot refuses the spell `name`. */
function refusing(name: string): unknown {
  return slotRefusal(sorcerer(3), content, { slot: SlotKey.parse('repertoire:sorcerer:1:0'), selection: spell(name) });
}

function slotAt(level: number, key: string, picks?: Readonly<Record<string, string>>): PreparedSlot | undefined {
  return slotsOf(level, picks).find((each) => each.key === SlotKey.parse(key));
}

describe('granted repertoire spells', () => {
  test('a gift fills the first repertoire slot of its rank, so the repertoire is no bigger than the slots', () => {
    const keys = slotsOf(3).map((each) => String(each.key));

    expect(keys).toHaveLength(2 + 3 + 3);
    expect(slotAt(3, 'repertoire:sorcerer:cantrip:0')).toMatchObject({ granted: true });
    expect(String(slotAt(3, 'repertoire:sorcerer:cantrip:0')?.pick?.name)).toBe('Gift-cantrip');
    expect(String(slotAt(3, 'repertoire:sorcerer:1:0')?.pick?.name)).toBe('Gift-first');
    expect(String(slotAt(3, 'repertoire:sorcerer:2:0')?.pick?.name)).toBe('Gift-second');
  });

  test('the slots after the gift stay the sorcerer to pick, from its tradition', () => {
    const slot = slotAt(3, 'repertoire:sorcerer:1:1');

    expect(slot?.granted).toBe(false);
    expect(slot?.pick).toBeUndefined();
    expect(slot?.options.map((each) => String(each.name))).toContain('Other-first');
  });

  test('a gift of a rank the sorcerer has no slots of yet is not in the repertoire', () => {
    expect(slotAt(1, 'repertoire:sorcerer:2:0')).toBeUndefined();
    expect(String(slotAt(1, 'repertoire:sorcerer:1:0')?.pick?.name)).toBe('Gift-first');
  });

  test('a gift slot offers the gift alone and refuses any other spell, a stored pick included', () => {
    const slot = slotAt(3, 'repertoire:sorcerer:1:0', { 'repertoire:sorcerer:1:0': 'other-first' });

    expect(slot?.options.map((each) => String(each.name))).toStrictEqual(['Gift-first']);
    expect(String(slot?.pick?.name)).toBe('Gift-first');
    expect(refusing('other-first')).toMatchObject({ field: 'selection' });
  });

  test('character reads carry a gift as a filled, granted slot', () => {
    const read = characterSlots(sorcerer(3), content).find(
      (each) => each.key === SlotKey.parse('repertoire:sorcerer:1:0'),
    );

    expect(read).toMatchObject({
      status: SlotStatus.Filled,
      subject: { kind: SlotSubjectKind.Spell, entry: 'sorcerer', rank: 1, granted: true },
      selectionName: 'Gift-first',
    });
  });

  test('a gift can be a signature spell like any other repertoire spell', () => {
    const document = sorcerer(3, { 'signature:sorcerer:1': 'gift-first' });
    const slot = signatureSlots(document, preparedReads(document, content)).find(
      (each) => each.key === SlotKey.parse('signature:sorcerer:1'),
    );

    expect(slot?.options.map((each) => String(each.name))).toStrictEqual(['Gift-first']);
    expect(String(slot?.pick?.name)).toBe('Gift-first');
    expect(slot?.castRanks.map(Number)).toStrictEqual([1, 2]);
  });

  test('a cantrip gift is no signature spell: signature slots come per rank, from 1st', () => {
    const document = sorcerer(3);
    const ranks = signatureSlots(document, preparedReads(document, content)).map((each) => Number(each.rank));

    expect(ranks).toStrictEqual([1, 2]);
  });
});

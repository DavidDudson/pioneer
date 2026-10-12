import { describe, expect, test } from 'bun:test';

import { ContentRegistry, SlotKey, SpellRank } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotInvalidMessage, SlotStatus, SlotSubjectKind } from './character-slot';
import { characterSlots } from './character-slot-status';
import { preparedSlots } from './prepared-spells';
import { castRanks, SignaturePickProblem, signatureSlots } from './signature-spells';
import type { SignatureSlot } from './signature-spells';
import { preparedReads, slotContent, slotRefusal } from './slot-offer';
import type { SlotPick } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, spellFixtureId, spellFixtures } from './testing';
import type { SpellFixture } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const KEY_ATTRIBUTE = 'boost:1:class:0';

/** A bard at `level` with `picks`, slot key to spell. */
function bard(level: number, picks: Readonly<Record<string, SpellFixture>> = {}): CharacterDocument {
  let builder = new CharacterBuilder()
    .named('bard')
    .picking('class', playerCoreClassId('bard'))
    .picking(KEY_ATTRIBUTE, 'cha')
    .atLevel(level);
  for (const [slot, spell] of Object.entries(picks)) {
    builder = builder.picking(slot, spellFixtureId(spell));
  }
  return builder.build().document;
}

function repertoireKeys(document: CharacterDocument): string[] {
  return preparedSlots(document, preparedReads(document, content)).map((slot) => String(slot.key));
}

function signaturesOf(document: CharacterDocument): SignatureSlot[] {
  return signatureSlots(document, preparedReads(document, content));
}

function signatureOf(document: CharacterDocument, key: string): SignatureSlot | undefined {
  return signaturesOf(document).find((slot) => slot.key === SlotKey.parse(key));
}

function ranks(...values: readonly number[]): SpellRank[] {
  return values.map((value) => SpellRank.parse(value));
}

function pick(slot: string, spell: SpellFixture): SlotPick {
  return { slot: SlotKey.parse(slot), selection: spellFixtureId(spell) };
}

/** Force Barrage is a 1st-rank spell. */
const FORCE_BARRAGE = SpellRank.parse(1);

describe('repertoire slots', () => {
  test("a 5th-level bard's repertoire has as many spells of each rank as slots: five cantrips, three 1st, three 2nd, two 3rd", () => {
    expect(repertoireKeys(bard(5))).toStrictEqual([
      ...[0, 1, 2, 3, 4].map((place) => `repertoire:bard:cantrip:${place}`),
      ...[0, 1, 2].map((place) => `repertoire:bard:1:${place}`),
      ...[0, 1, 2].map((place) => `repertoire:bard:2:${place}`),
      ...[0, 1].map((place) => `repertoire:bard:3:${place}`),
    ]);
  });

  test("a repertoire slot offers its tradition's spells of its rank or lower, learned heightened", () => {
    const document = bard(5);
    const slot = preparedSlots(document, preparedReads(document, content)).find(
      (each) => each.key === SlotKey.parse('repertoire:bard:3:0'),
    );

    expect(slot?.options.map((spell) => String(spell.name))).toStrictEqual(['Force-barrage']);
    expect(slot?.castRank).toBe(SpellRank.parse(3));
  });

  test('selectSlot refuses a spell of another tradition in a repertoire slot', () => {
    const document = bard(5);

    expect(slotRefusal(document, content, pick('repertoire:bard:1:0', 'heal'))).toMatchObject({ field: 'selection' });
    expect(slotRefusal(document, content, pick('repertoire:bard:1:0', 'force-barrage'))).toBeUndefined();
  });
});

describe('signature slots', () => {
  test('a bard has none before Signature Spells at 3rd level, then one per rank of its slots', () => {
    expect(signaturesOf(bard(2))).toStrictEqual([]);
    expect(signaturesOf(bard(5)).map((slot) => String(slot.key))).toStrictEqual([
      'signature:bard:1',
      'signature:bard:2',
      'signature:bard:3',
    ]);
  });

  test('a signature slot offers the spells the repertoire knows at its rank, each once', () => {
    const document = bard(5, {
      'repertoire:bard:1:0': 'force-barrage',
      'repertoire:bard:1:1': 'force-barrage',
      'repertoire:bard:3:0': 'force-barrage',
    });

    expect(signatureOf(document, 'signature:bard:1')?.options.map((spell) => String(spell.name))).toStrictEqual([
      'Force-barrage',
    ]);
    expect(signatureOf(document, 'signature:bard:2')?.options).toStrictEqual([]);
    expect(signatureOf(document, 'signature:bard:3')?.options.map((spell) => String(spell.name))).toStrictEqual([
      'Force-barrage',
    ]);
  });

  test("a signature spell is cast at every rank from its own to the entry's highest", () => {
    const document = bard(5, { 'repertoire:bard:1:0': 'force-barrage', 'signature:bard:1': 'force-barrage' });

    expect(signatureOf(document, 'signature:bard:1')?.castRanks).toStrictEqual(ranks(1, 2, 3));
  });

  test('a signature pick the repertoire no longer knows at its rank reads invalid with its own reason', () => {
    const document = bard(5, { 'signature:bard:1': 'force-barrage' });
    const slot = signatureOf(document, 'signature:bard:1');
    const read = characterSlots(document, content).find((each) => each.key === SlotKey.parse('signature:bard:1'));

    expect(slot?.problem).toBe(SignaturePickProblem.NotInRepertoire);
    expect(slot?.castRanks).toStrictEqual([]);
    expect(read).toMatchObject({
      status: SlotStatus.Invalid,
      subject: { kind: SlotSubjectKind.Signature, entry: 'bard', rank: 1 },
      reason: { key: SlotInvalidMessage.SpellNotInRepertoire },
    });
  });

  test('character reads carry repertoire and signature slots', () => {
    const document = bard(5, { 'repertoire:bard:1:0': 'force-barrage', 'signature:bard:1': 'force-barrage' });
    const read = (key: string): unknown => characterSlots(document, content).find((each) => each.key === key);

    expect(read('repertoire:bard:1:0')).toMatchObject({
      status: SlotStatus.Filled,
      subject: { kind: SlotSubjectKind.Spell, entry: 'bard', rank: 1 },
    });
    expect(read('signature:bard:1')).toMatchObject({ status: SlotStatus.Filled, selectionName: 'Force-barrage' });
    expect(read('signature:bard:2')).toMatchObject({ status: SlotStatus.Open });
  });

  test('selectSlot takes a signature spell the repertoire knows at its rank, and refuses any other or a closed slot', () => {
    const document = bard(5, { 'repertoire:bard:1:0': 'force-barrage' });

    expect(slotRefusal(document, content, pick('signature:bard:1', 'force-barrage'))).toBeUndefined();
    expect(slotRefusal(document, content, pick('signature:bard:3', 'force-barrage'))).toMatchObject({
      field: 'selection',
    });
    expect(slotRefusal(bard(2), content, pick('signature:bard:1', 'force-barrage'))).toMatchObject({ field: 'slot' });
  });
});

describe('castRanks', () => {
  test('a spell that is not a signature spell is cast only at the rank it was learned', () => {
    expect(
      castRanks({ own: FORCE_BARRAGE, learned: SpellRank.parse(3), signature: false, highest: SpellRank.parse(5) }),
    ).toStrictEqual(ranks(3));
  });

  test('a signature spell heightens freely up to the highest rank, and down to its own', () => {
    expect(
      castRanks({ own: FORCE_BARRAGE, learned: SpellRank.parse(1), signature: true, highest: SpellRank.parse(4) }),
    ).toStrictEqual(ranks(1, 2, 3, 4));
    expect(
      castRanks({ own: FORCE_BARRAGE, learned: SpellRank.parse(3), signature: true, highest: SpellRank.parse(4) }),
    ).toStrictEqual(ranks(1, 2, 3, 4));
  });
});

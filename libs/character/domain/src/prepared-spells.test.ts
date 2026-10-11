import { describe, expect, test } from 'bun:test';

import { ContentRegistry, ContentText, SlotKey, SpellRank } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotInvalidMessage, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { PreparedPickProblem, preparedSlots, SpellAccessProblem, spellAccessProblem } from './prepared-spells';
import type { PreparedSlot } from './prepared-spells';
import { preparedReads, slotContent, slotRefusal } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, spellFixtureId, spellFixtures } from './testing';
import type { PlayerCoreClass, SpellFixture } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const KEY_ATTRIBUTE = 'boost:1:class:0';

function caster(
  name: PlayerCoreClass,
  level: number,
  picks: Readonly<Record<string, SpellFixture>> = {},
): CharacterBuilder {
  let builder = new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking(KEY_ATTRIBUTE, 'str')
    .atLevel(level);
  for (const [slot, spell] of Object.entries(picks)) {
    builder = builder.picking(slot, spellFixtureId(spell));
  }
  return builder;
}

function withAccess(document: CharacterDocument, ...spells: readonly SpellFixture[]): CharacterDocument {
  return { ...document, build: { ...document.build, spellAccess: spells.map((spell) => spellFixtureId(spell)) } };
}

function slotsOf(document: CharacterDocument): PreparedSlot[] {
  return preparedSlots(document, preparedReads(document, content));
}

function slotOf(document: CharacterDocument, key: string): PreparedSlot | undefined {
  return slotsOf(document).find((slot) => slot.key === SlotKey.parse(key));
}

/** The names of the spells a slot offers. */
function offered(document: CharacterDocument, key: string): string[] {
  return (slotOf(document, key)?.options ?? []).map((spell) => spell.name);
}

describe('preparedSlots', () => {
  test('a 1st-level wizard has a slot per cantrip and per 1st-rank slot, keyed by entry, rank and place', () => {
    const keys = slotsOf(caster('wizard', 1).build().document).map((slot) => String(slot.key));

    expect(keys).toStrictEqual([
      'prepared:wizard:cantrip:0',
      'prepared:wizard:cantrip:1',
      'prepared:wizard:cantrip:2',
      'prepared:wizard:cantrip:3',
      'prepared:wizard:cantrip:4',
      'prepared:wizard:1:0',
      'prepared:wizard:1:1',
    ]);
  });

  test("a cantrip slot offers the tradition's cantrips, heightened to half the level rounded up", () => {
    const { document } = caster('wizard', 5).build();

    expect(offered(document, 'prepared:wizard:cantrip:0')).toStrictEqual(['Detect-magic', 'Shield']);
    expect(slotOf(document, 'prepared:wizard:cantrip:0')?.castRank).toBe(SpellRank.parse(3));
  });

  test("a spell slot offers the tradition's spells of its rank or lower, heightened, and no cantrip or focus spell", () => {
    const { document } = caster('wizard', 5).build();

    expect(offered(document, 'prepared:wizard:1:0')).toStrictEqual(['Force-barrage']);
    expect(offered(document, 'prepared:wizard:3:0')).toStrictEqual(['Fireball', 'Force-barrage']);
    expect(slotOf(document, 'prepared:wizard:3:0')?.castRank).toBe(SpellRank.parse(3));
  });

  test('an uncommon spell is offered once the build lists access to it', () => {
    const { document } = caster('wizard', 5).build();

    expect(offered(withAccess(document, 'veil-of-privacy'), 'prepared:wizard:3:0')).toStrictEqual([
      'Fireball',
      'Force-barrage',
      'Veil-of-privacy',
    ]);
  });

  test("a cleric's slots offer divine spells", () => {
    expect(offered(caster('cleric', 1).build().document, 'prepared:cleric:1:0')).toStrictEqual(['Heal']);
  });

  test('a spontaneous caster and a fighter have no prepared slots', () => {
    expect(slotsOf(caster('bard', 5).build().document)).toStrictEqual([]);
    expect(slotsOf(caster('fighter', 5).build().document)).toStrictEqual([]);
  });

  test('a pick the slot takes is its pick; one it does not names why', () => {
    const { document } = caster('wizard', 5, {
      'prepared:wizard:1:0': 'force-barrage',
      'prepared:wizard:1:1': 'heal',
      'prepared:wizard:3:0': 'veil-of-privacy',
      'prepared:wizard:3:1': 'fireball',
    }).build();

    expect(slotOf(document, 'prepared:wizard:1:0')?.pick?.name).toBe(ContentText.parse('Force-barrage'));
    expect(slotOf(document, 'prepared:wizard:1:1')?.problem).toBe(PreparedPickProblem.Unfit);
    expect(slotOf(document, 'prepared:wizard:3:0')?.problem).toBe(PreparedPickProblem.NoAccess);
    expect(slotOf(document, 'prepared:wizard:3:1')?.problem).toBeUndefined();
  });
});

describe('slotRefusal for a prepared slot', () => {
  const { document: wizard } = caster('wizard', 5).build();

  test('takes a spell the slot offers', () => {
    const pick = { slot: SlotKey.parse('prepared:wizard:3:0'), selection: spellFixtureId('force-barrage') };

    expect(slotRefusal(wizard, content, pick)).toBeUndefined();
  });

  test('refuses a spell of another tradition', () => {
    const pick = { slot: SlotKey.parse('prepared:wizard:1:0'), selection: spellFixtureId('heal') };

    expect(slotRefusal(wizard, content, pick)?.message.key).toBe('character.validation.selectionNotOffered');
  });

  test('refuses an uncommon spell without access, saying so', () => {
    const pick = { slot: SlotKey.parse('prepared:wizard:3:0'), selection: spellFixtureId('veil-of-privacy') };

    expect(slotRefusal(wizard, content, pick)?.message.key).toBe('character.validation.spellNoAccess');
    expect(slotRefusal(withAccess(wizard, 'veil-of-privacy'), content, pick)).toBeUndefined();
  });

  test('refuses a slot the character does not have at its level', () => {
    const pick = { slot: SlotKey.parse('prepared:wizard:4:0'), selection: spellFixtureId('fireball') };

    expect(slotRefusal(wizard, content, pick)).toStrictEqual({
      field: 'slot',
      message: { key: 'character.validation.slotNotOpen' },
    });
  });
});

function statusOf(document: CharacterDocument, key: string): unknown {
  return characterSlots(document, content).find((slot) => slot.key === SlotKey.parse(key));
}

describe('characterSlots with prepared slots', () => {
  test('a prepared pick is filled and named, with its entry and rank', () => {
    const { document } = caster('wizard', 5, { 'prepared:wizard:3:0': 'fireball' }).build();

    expect(statusOf(document, 'prepared:wizard:3:0')).toStrictEqual({
      status: SlotStatus.Filled,
      key: 'prepared:wizard:3:0',
      subject: { kind: 'spell', entry: 'wizard', rank: 3 },
      selection: spellFixtureId('fireball'),
      selectionName: 'Fireball',
    });
  });

  test('an uncommon pick whose access was revoked is invalid, saying why', () => {
    const { document } = caster('wizard', 5, { 'prepared:wizard:3:0': 'veil-of-privacy' }).build();

    expect(statusOf(document, 'prepared:wizard:3:0')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: SlotInvalidMessage.SpellNoAccess },
    });
  });

  test('a pick kept for a slot gone with a lower level is hidden, named, never planned', () => {
    const { document } = caster('wizard', 1, { 'prepared:wizard:3:0': 'fireball' }).build();

    expect(statusOf(document, 'prepared:wizard:3:0')).toStrictEqual({
      status: SlotStatus.Hidden,
      key: 'prepared:wizard:3:0',
      selection: spellFixtureId('fireball'),
      selectionName: 'Fireball',
    });
  });
});

describe('spellAccessProblem', () => {
  test('takes an uncommon, rare or unique spell that goes in a slot', () => {
    expect(spellAccessProblem(content.spells, [], spellFixtureId('veil-of-privacy'))).toBeUndefined();
    expect(spellAccessProblem(content.spells, [], spellFixtureId('wish'))).toBeUndefined();
    expect(spellAccessProblem(content.spells, [], spellFixtureId('ring-of-truth'))).toBeUndefined();
  });

  test('refuses a common spell, a focus spell and an unknown id', () => {
    expect(spellAccessProblem(content.spells, [], spellFixtureId('fireball'))).toBe(SpellAccessProblem.Common);
    expect(spellAccessProblem(content.spells, [], spellFixtureId('force-bolt'))).toBe(SpellAccessProblem.UnknownSpell);
    expect(spellAccessProblem(content.spells, [], playerCoreClassId('wizard'))).toBe(SpellAccessProblem.UnknownSpell);
  });
});

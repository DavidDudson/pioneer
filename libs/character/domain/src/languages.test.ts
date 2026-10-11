import { describe, expect, test } from 'bun:test';

import { ContentRegistry, LanguageCount, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterLanguages } from './character-languages';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import { characterSlots } from './character-slot-status';
import { knownLanguages, LanguageSource, languageSlots, openLanguageSlots } from './languages';
import { languageReads, slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  languageBackgroundId,
  languageDwarfId,
  languageFixtureId,
  languageFixtures,
  languageOrcId,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtureId,
  skillFixtures,
} from './testing';
import type { LanguageBackground, LanguageFixture } from './testing';

const registry = new ContentRegistry();
registry.register(languageFixtures());
registry.register(playerCoreClasses());
registry.register(skillFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const language = (name: LanguageFixture): ContentId => languageFixtureId(name);
const background = (name: LanguageBackground): string => languageBackgroundId(name);

function dwarf(): CharacterBuilder {
  return new CharacterBuilder().named('Dwarf').picking('ancestry', languageDwarfId);
}

function keysOf(builder: CharacterBuilder): readonly string[] {
  const { document } = builder.build();
  return languageSlots(document, languageReads(document, content)).map((slot) => slot.key);
}

function knownOf(builder: CharacterBuilder): readonly string[] {
  const { document } = builder.build();
  return knownLanguages(document, languageReads(document, content)).map(({ language: known }) => known.name);
}

function offersOf(builder: CharacterBuilder, key: string): readonly string[] {
  const { document } = builder.build();
  const slot = languageSlots(document, languageReads(document, content)).find((each) => each.key === key);
  return slot?.options.map(({ name }) => name) ?? [];
}

function refusalOf(builder: CharacterBuilder, slot: string, name: LanguageFixture): string | undefined {
  const pick = { slot: SlotKey.parse(slot), selection: language(name) };
  return slotRefusal(builder.build().document, content, pick)?.message.key;
}

function slotOf(builder: CharacterBuilder, key: string): unknown {
  return characterSlots(builder.build().document, content).find((slot) => slot.key === key);
}

describe('language slots', () => {
  test('none before an ancestry is picked', () => {
    expect(keysOf(new CharacterBuilder())).toEqual([]);
  });

  test("the ancestry's count at 1st level, with Intelligence +0", () => {
    expect(keysOf(dwarf())).toEqual(['language:1:0']);
  });

  test('the Intelligence modifier adds to them, and a later raise adds one at its level', () => {
    const clever = dwarf().picking('boost:1:ancestry:0', 'int').picking('boost:1:free:0', 'int');

    expect(keysOf(clever)).toEqual(['language:1:0', 'language:1:1', 'language:1:2']);
    expect(keysOf(dwarf().picking('boost:5:free:0', 'int'))).toEqual(['language:1:0', 'language:5:0']);
  });

  test("they offer common languages and the ancestry's list, less those known", () => {
    expect(offersOf(dwarf(), 'language:1:0')).toEqual(['Draconic', 'Elven', 'Goblin', 'Petran']);
  });

  test('a language known already is refused and reads invalid; a rarer one is not offered', () => {
    const picked = dwarf().picking('boost:1:ancestry:0', 'int').picking('language:1:0', language('elven'));

    expect(refusalOf(picked, 'language:1:1', 'elven')).toBe('character.validation.languageKnown');
    expect(refusalOf(picked, 'language:1:1', 'dwarven')).toBe('character.validation.languageKnown');
    expect(refusalOf(picked, 'language:1:1', 'empyrean')).toBe('character.validation.selectionNotOffered');
    expect(refusalOf(picked, 'language:1:1', 'petran')).toBeUndefined();
    const twice = picked.picking('language:1:1', language('elven'));
    expect(slotOf(twice, 'language:1:1')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.languageKnown' },
    });
  });

  test('a pick read as a filled slot names its language and its subject its level', () => {
    const elven = dwarf().picking('language:1:0', language('elven'));
    expect(slotOf(elven, 'language:1:0')).toEqual({
      status: SlotStatus.Filled,
      key: SlotKey.parse('language:1:0'),
      subject: { kind: SlotSubjectKind.Language, level: Level.parse(1) },
      selection: language('elven'),
      selectionName: 'Elven',
    });
  });
});

describe('Language elements', () => {
  test('a granted language is known, from its feature', () => {
    const envoy = dwarf().picking('background', background('envoy'));
    const { document } = envoy.build();
    const known = knownLanguages(document, languageReads(document, content));

    expect(known.map(({ language: each, source }) => [String(each.name), source])).toEqual([
      ['Common', LanguageSource.Ancestry],
      ['Dwarven', LanguageSource.Ancestry],
      ['Empyrean', LanguageSource.Feature],
    ]);
  });

  test('a language granted twice is known once', () => {
    const friend = dwarf().picking('background', background('dwarf-friend'));
    expect(knownOf(friend)).toEqual(['Common', 'Dwarven']);
  });

  test('slots open with their entry, keyed by entry and rule, offering up to their access', () => {
    const linguist = dwarf().picking('background', background('linguist'));
    const entry = background('linguist');

    expect(keysOf(linguist)).toEqual(['language:1:0', `language:${entry}:0:0`, `language:${entry}:0:1`]);
    expect(offersOf(linguist, `language:${entry}:0:0`)).toEqual(['Draconic', 'Elven', 'Empyrean', 'Goblin', 'Petran']);
    expect(slotOf(linguist, `language:${entry}:0:0`)).toMatchObject({
      subject: { kind: SlotSubjectKind.Language, level: 1, entry, entryName: 'Linguist' },
    });
  });

  test('a slot behind a Society rank opens at the level the character reaches it', () => {
    const entry = background('linguist');
    const society = skillFixtureId('society');
    const master = dwarf()
      .picking('background', entry)
      .picking('class', playerCoreClassId('fighter'))
      .picking('boost:1:class:0', 'str')
      .picking('skill-training:1:0', society)
      .picking('skill-increase:3', society)
      .picking('skill-increase:7', society);

    expect(keysOf(master)).toContain(`language:${entry}:1:0`);
    expect(slotOf(master, `language:${entry}:1:0`)).toMatchObject({ status: SlotStatus.Planned, level: 7 });
    expect(keysOf(master)).not.toContain(`language:${entry}:2:0`);
    expect(slotOf(master.atLevel(7), `language:${entry}:1:0`)).toMatchObject({ status: SlotStatus.Open });
  });
});

describe('the known list', () => {
  test("the ancestry's languages, then the picks in the slots the character has at its level", () => {
    const picked = dwarf().picking('language:1:0', language('goblin')).picking('boost:5:free:0', 'int');

    const planned = picked.picking('language:5:0', language('elven'));
    expect(knownOf(planned)).toEqual(['Common', 'Dwarven', 'Goblin']);
    expect(knownOf(planned.atLevel(5))).toEqual(['Common', 'Dwarven', 'Goblin', 'Elven']);
  });

  test('open slots count only those up to the level', () => {
    const { document } = dwarf().picking('boost:5:free:0', 'int').build();
    const slots = languageSlots(document, languageReads(document, content));

    const atFirst = openLanguageSlots(slots, Level.parse(1));
    const atFifth = openLanguageSlots(slots, Level.parse(5));

    expect([atFirst, atFifth]).toEqual([LanguageCount.parse(1), LanguageCount.parse(2)]);
  });
});

describe('the sheet languages', () => {
  test('the known list with sources by name, what is left to add and the next slot with its offers', () => {
    const envoy = dwarf().picking('background', background('envoy')).picking('language:1:0', language('goblin'));
    const filled = characterLanguages(envoy.build().document, content);
    expect(filled.known).toMatchObject([
      { name: 'Common', from: 'Dwarf' },
      { name: 'Dwarven', from: 'Dwarf' },
      { name: 'Empyrean', from: 'Envoy' },
      { name: 'Goblin', slot: 'language:1:0' },
    ]);
    expect(filled.next).toBeUndefined();

    const clever = envoy.picking('boost:1:ancestry:0', 'int');
    const open = characterLanguages(clever.build().document, content);
    expect(open.open).toBe(LanguageCount.parse(1));
    expect(open.next?.slot).toBe(SlotKey.parse('language:1:1'));
    expect(open.next?.options.map(({ name }) => String(name))).toEqual(['Draconic', 'Elven', 'Petran']);
  });
});

describe('Intelligence and later grants', () => {
  test('a negative Intelligence modifier takes nothing away, and raising it to +0 adds nothing', () => {
    const orc = new CharacterBuilder().named('Orc').picking('ancestry', languageOrcId);

    expect(keysOf(orc)).toEqual(['language:1:0']);
    expect(keysOf(orc.picking('boost:5:free:0', 'int'))).toEqual(['language:1:0']);
  });

  test('a pick a feature later grants reads invalid at that level, and its slot is the next to fill', () => {
    const scholar = dwarf().picking('background', background('scholar')).picking('language:1:0', language('elven'));

    expect(slotOf(scholar, 'language:1:0')).toMatchObject({ status: SlotStatus.Filled });
    const fifth = scholar.atLevel(5);
    expect(slotOf(fifth, 'language:1:0')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.languageKnown' },
    });
    const sheet = characterLanguages(fifth.build().document, content);
    expect(sheet.known.map(({ name }) => String(name))).toEqual(['Common', 'Dwarven', 'Elven']);
    expect(sheet.next?.slot).toBe(SlotKey.parse('language:1:0'));
  });
});

describe('picks in other slots', () => {
  test('a language a later slot holds is neither offered to nor taken by an earlier empty one', () => {
    const clever = dwarf().picking('boost:1:ancestry:0', 'int').picking('language:1:1', language('goblin'));

    expect(offersOf(clever, 'language:1:0')).not.toContain('Goblin');
    expect(refusalOf(clever, 'language:1:0', 'goblin')).toBe('character.validation.languageKnown');
  });

  test('an invalid pick leaves its slot open, the next for Add language', () => {
    const scholar = dwarf().picking('background', background('scholar')).picking('language:1:0', language('elven'));
    const { open, next } = characterLanguages(scholar.atLevel(5).build().document, content);

    expect([open, next?.slot]).toEqual([LanguageCount.parse(1), SlotKey.parse('language:1:0')]);
  });
});

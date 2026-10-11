import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, Level, Selector, SlotKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SlotStatus, SlotSubjectKind } from './character-slot';
import { characterSlots } from './character-slot-status';
import { buildRanks } from './class-build';
import { increasedRank, SkillSlotKind, skillSlots } from './skill-training';
import { skillReads, slotContent, slotRefusal } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, skillFixtureId, skillFixtures } from './testing';
import type { PlayerCoreClass, SkillFixture } from './testing';

const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const backgrounds = new ContentPackBuilder()
  .withId('skill-backgrounds')
  .withBackground('acolyte', [ALL], [{ key: 'Proficiency', selector: 'skill:religion', rank: 'trained' }])
  .withBackground('scribe', [ALL], [{ key: 'Proficiency', selector: 'skill:lore:scribing', rank: 'trained' }])
  .build();
const acolyte = new ContentPackBuilder().withId('skill-backgrounds').idOf(ContentKind.Background, 'acolyte');

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
registry.register(backgrounds);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const KEY_ATTRIBUTE = 'boost:1:class:0';

function as(name: PlayerCoreClass): CharacterBuilder {
  return new CharacterBuilder().named(name).picking('class', playerCoreClassId(name)).picking(KEY_ATTRIBUTE, 'dex');
}

function skill(name: SkillFixture): ContentId {
  return skillFixtureId(name);
}

function keysOf(builder: CharacterBuilder): readonly string[] {
  const { document } = builder.build();
  return skillSlots(document, skillReads(document, content)).map((slot) => slot.key);
}

function training(level: number, count: number): string[] {
  return Array.from({ length: count }, (_unused, index) => `skill-training:${level}:${index}`);
}

function refusalOf(builder: CharacterBuilder, slot: string, selection: SkillFixture): string | undefined {
  const pick = { slot: SlotKey.parse(slot), selection: skillFixtureId(selection) };
  return slotRefusal(builder.build().document, content, pick)?.message.key;
}

function increases(name: PlayerCoreClass): readonly string[] {
  return keysOf(as(name)).filter((key) => key.startsWith('skill-increase'));
}

function rankOf(builder: CharacterBuilder, selector: string): string | undefined {
  const { document } = builder.build();
  return buildRanks(document, content).get(Selector.parse(selector));
}

describe('trained skill slots', () => {
  test('none before a class is picked', () => {
    expect(keysOf(new CharacterBuilder())).toEqual([]);
  });

  test("a class's additional skills at 1st level, with Intelligence +0", () => {
    expect(keysOf(as('fighter')).filter((key) => key.startsWith('skill-training'))).toEqual(training(1, 3));
  });

  test('the Intelligence modifier adds to them', () => {
    const clever = as('fighter').picking('boost:1:ancestry:0', 'int').picking('boost:1:free:0', 'int');

    expect(keysOf(clever).filter((key) => key.startsWith('skill-training:1'))).toEqual(training(1, 5));
  });

  test('a boost raising Intelligence later adds one at that level: planned until the character gets there', () => {
    const later = as('fighter').picking('boost:5:free:0', 'int');

    expect(keysOf(later)).toContain('skill-training:5:0');
    expect(characterSlots(later.build().document, content).find((slot) => slot.key === 'skill-training:5:0')).toEqual({
      status: SlotStatus.Planned,
      key: SlotKey.parse('skill-training:5:0'),
      subject: { kind: SlotSubjectKind.Skill, source: SkillSlotKind.Training, level: Level.parse(5) },
      level: Level.parse(5),
    });
    expect(
      characterSlots(later.atLevel(5).build().document, content).find((slot) => slot.key === 'skill-training:5:0'),
    ).toMatchObject({ status: SlotStatus.Open });
  });

  test('a skill the class and background both train gives one more slot to train another', () => {
    const cleric = as('cleric');

    expect(keysOf(cleric).filter((key) => key.startsWith('skill-training'))).toEqual(training(1, 2));
    expect(keysOf(cleric.picking('background', acolyte)).filter((key) => key.startsWith('skill-training'))).toEqual(
      training(1, 3),
    );
  });

  test('a skill trained already, by a grant or an earlier slot, is refused and reads invalid', () => {
    const cleric = as('cleric').picking('skill-training:1:0', skill('athletics'));

    expect(refusalOf(cleric, 'skill-training:1:1', 'religion')).toBe('character.validation.skillTrained');
    expect(refusalOf(cleric, 'skill-training:1:1', 'athletics')).toBe('character.validation.skillTrained');
    expect(refusalOf(cleric, 'skill-training:1:1', 'stealth')).toBeUndefined();

    const twice = characterSlots(cleric.picking('skill-training:1:1', skill('athletics')).build().document, content);
    expect(twice.find((slot) => slot.key === 'skill-training:1:1')).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: 'rules.choices.invalid.skillTrained' },
    });
  });

  test('a Lore is a skill like any other, its rank on its own selector', () => {
    const scribe = as('fighter').picking('skill-training:1:0', skill('scribing-lore'));

    expect(refusalOf(as('fighter'), 'skill-training:1:0', 'scribing-lore')).toBeUndefined();
    expect(rankOf(scribe, 'skill:lore:scribing')).toBe('trained');
  });

  test('a pick that is no skill is not offered', () => {
    const pick = { slot: SlotKey.parse('skill-training:1:0'), selection: playerCoreClassId('wizard') };

    expect(slotRefusal(as('fighter').build().document, content, pick)?.message.key).toBe(
      'character.validation.selectionNotOffered',
    );
  });

  test('a pick past the slots the character has, after Intelligence drops, is kept hidden', () => {
    const clever = as('fighter')
      .picking('boost:1:ancestry:0', 'int')
      .picking('skill-training:1:3', skill('arcana'))
      .picking('boost:1:ancestry:0', 'str');

    expect(characterSlots(clever.build().document, content).find((slot) => slot.key === 'skill-training:1:3')).toEqual({
      status: SlotStatus.Hidden,
      key: SlotKey.parse('skill-training:1:3'),
      selection: skill('arcana'),
    });
  });
});

describe('skill increase slots', () => {
  test("at Player Core's levels, and a rogue's every level from 2nd", () => {
    expect(increases('fighter')).toEqual([3, 5, 7, 9, 11, 13, 15, 17, 19].map((level) => `skill-increase:${level}`));
    expect(increases('rogue')).toEqual(Array.from({ length: 19 }, (_unused, index) => `skill-increase:${index + 2}`));
  });

  test('raise a skill one rank: trained to expert at any level, master from 7th, legendary from 15th', () => {
    expect(increasedRank(undefined, Level.parse(3))).toBe('trained');
    expect(increasedRank('trained', Level.parse(2))).toBe('expert');
    expect(increasedRank('expert', Level.parse(5))).toBeUndefined();
    expect(increasedRank('expert', Level.parse(7))).toBe('master');
    expect(increasedRank('master', Level.parse(13))).toBeUndefined();
    expect(increasedRank('master', Level.parse(15))).toBe('legendary');
    expect(increasedRank('legendary', Level.parse(20))).toBeUndefined();
  });

  test('an increase past the rank its level allows is refused, and counts for nothing', () => {
    const fighter = as('fighter')
      .atLevel(7)
      .picking('skill-training:1:0', skill('athletics'))
      .picking('skill-increase:3', skill('athletics'));

    expect(refusalOf(fighter, 'skill-increase:5', 'athletics')).toBe('character.validation.skillRankCapped');
    expect(refusalOf(fighter, 'skill-increase:7', 'athletics')).toBeUndefined();

    const capped = fighter.picking('skill-increase:5', skill('athletics'));
    expect(
      characterSlots(capped.build().document, content).find((slot) => slot.key === 'skill-increase:5'),
    ).toMatchObject({ status: SlotStatus.Invalid, reason: { key: 'rules.choices.invalid.skillRankCapped' } });
    expect(rankOf(capped, 'skill:athletics')).toBe('expert');
    const master = capped.picking('skill-increase:7', skill('athletics'));
    expect(rankOf(master, 'skill:athletics')).toBe('master');
  });

  test('an increase may train a skill the character is untrained in', () => {
    const fighter = as('fighter').atLevel(3).picking('skill-increase:3', skill('medicine'));

    expect(rankOf(fighter, 'skill:medicine')).toBe('trained');
  });

  test('an increase above the character level is the plan: the rank waits for the level', () => {
    const fighter = as('fighter')
      .atLevel(2)
      .picking('skill-training:1:0', skill('athletics'))
      .picking('skill-increase:3', skill('athletics'));

    expect(rankOf(fighter, 'skill:athletics')).toBe('trained');
    expect(rankOf(fighter.atLevel(3), 'skill:athletics')).toBe('expert');
  });

  test("a grant's rank stands: an increase raises from it", () => {
    const cleric = as('cleric').atLevel(3).picking('skill-increase:3', skill('religion'));

    expect(rankOf(cleric, 'skill:religion')).toBe('expert');
  });
});

describe('skills a later pack restates', () => {
  test("a pick of the first pack's statistic still counts once a later pack restates its selector", () => {
    const restated = new ContentRegistry();
    restated.register(playerCoreClasses());
    restated.register(skillFixtures());
    restated.register(
      new ContentPackBuilder()
        .withId('homebrew-athletics')
        .withStatistic('athletics', { selector: 'skill:athletics', domains: ['skill-check'] })
        .build(),
    );
    const restatedContent = { ...slotContent(restated), namespaces: CORE_NAMESPACES };
    const { document } = as('fighter').picking('skill-training:1:0', skill('athletics')).build();

    expect(buildRanks(document, restatedContent).get(Selector.parse('skill:athletics'))).toBe('trained');
    expect(characterSlots(document, restatedContent).find((slot) => slot.key === 'skill-training:1:0')).toMatchObject({
      status: SlotStatus.Filled,
    });
  });
});

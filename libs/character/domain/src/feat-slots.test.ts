import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SlotInvalidMessage, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { featSlots, withoutPick } from './feat-slots';
import { PrerequisiteStatus } from './prerequisite-status';
import { slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  featSlotFixtureId,
  skillFixtureId,
  skillFixtures,
} from './testing';
import type { FeatSlotFixture } from './testing';

const idOf = featSlotFixtureId;
const classId = FEAT_SLOT_FIGHTER;
const { level1: LEVEL_1, level2: LEVEL_2, level4: LEVEL_4, bonus: BONUS } = FEAT_SLOT_KEYS;

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function fighter(level = 1): CharacterBuilder {
  return new CharacterBuilder().picking('class', classId).atLevel(level);
}

type Statuses = Record<string, PrerequisiteStatus>;

/** The feats `slot` offers, by name, with whether the character meets their prerequisites. */
function offered(character: CharacterBuilder, slot: SlotKey): Statuses {
  const read = featSlots(character.build().document, content).find((each) => each.key === slot);
  return Object.fromEntries(read?.options.map((option) => [option.label.toLowerCase(), option.status]) ?? []);
}

function slotOf(character: CharacterBuilder, slot: SlotKey): unknown {
  return characterSlots(character.build().document, content).find((each) => each.key === slot);
}

describe('featSlots', () => {
  test('lists each feat slot up to 20th level at the level it opens, lowest first', () => {
    const slots = featSlots(fighter(2).build().document, content);
    expect(slots.map((slot) => `${slot.key} at ${slot.level}`)).toEqual([
      `${LEVEL_1} at 1`,
      `${LEVEL_2} at 2`,
      `${LEVEL_4} at 4`,
      `${BONUS} at 8`,
    ]);
  });

  test('offers the feats of its kind up to its own level, however high the character is', () => {
    const atTen = fighter(10);
    expect(Object.keys(offered(atTen, LEVEL_1)).toSorted()).toEqual([
      'acrobatic-flourish',
      'brawn',
      'eagle-eye',
      'field-medic',
      'keen-eye',
      'power-attack',
      'reactive-shield',
      'shield-brawler',
      'skill-training',
      'sudden-charge',
    ]);
    expect(Object.keys(offered(atTen, LEVEL_2))).toContain('lunge');
    expect(Object.keys(offered(atTen, LEVEL_4))).toContain('knockdown');
  });

  test('reads each prerequisite as met, not met, or unknown when its text did not parse', () => {
    expect(offered(fighter(), LEVEL_1)).toEqual({
      'acrobatic-flourish': PrerequisiteStatus.Unmet,
      brawn: PrerequisiteStatus.Unmet,
      'eagle-eye': PrerequisiteStatus.Unmet,
      'field-medic': PrerequisiteStatus.Met,
      'keen-eye': PrerequisiteStatus.Met,
      'power-attack': PrerequisiteStatus.Met,
      'reactive-shield': PrerequisiteStatus.Unknown,
      'shield-brawler': PrerequisiteStatus.Unmet,
      'skill-training': PrerequisiteStatus.Met,
      'sudden-charge': PrerequisiteStatus.Unmet,
    });
  });

  test('reads each clause of a feat with several, and the feat by them when it has no predicate of its own', () => {
    const read = featSlots(fighter().build().document, content).find((each) => each.key === LEVEL_1);
    const clausesOf = (name: string): unknown =>
      read?.options.find((option) => option.label.toLowerCase() === name)?.clauses;

    expect(clausesOf('shield-brawler')).toEqual([
      { text: 'expert in Athletics', status: PrerequisiteStatus.Unmet },
      { text: 'expert in Perception', status: PrerequisiteStatus.Met },
      { text: 'an animal companion', status: PrerequisiteStatus.Unknown },
    ]);
    expect(clausesOf('field-medic')).toEqual([
      { text: 'trained in Athletics', status: PrerequisiteStatus.Met },
      { text: 'expert in Perception', status: PrerequisiteStatus.Met },
    ]);
    expect(clausesOf('power-attack')).toBeUndefined();
    expect(offered(fighter(), LEVEL_1)).toMatchObject({
      'shield-brawler': PrerequisiteStatus.Unmet,
      'field-medic': PrerequisiteStatus.Met,
    });
  });

  test('meets a skill rank a feat raises on the skill its ChoiceSet stored, at the next slot', () => {
    const training = idOf('skill-training');
    const trained = fighter(2).picking(LEVEL_1, training).picking(`${training}:0`, 'acrobatics');
    expect(offered(trained, LEVEL_2)['acrobatic-flourish']).toBe(PrerequisiteStatus.Met);
    expect(offered(trained, LEVEL_1)['acrobatic-flourish']).toBe(PrerequisiteStatus.Unmet);
    const otherSkill = fighter(2).picking(LEVEL_1, training).picking(`${training}:0`, 'athletics');
    expect(offered(otherSkill, LEVEL_2)['acrobatic-flourish']).toBe(PrerequisiteStatus.Unmet);
    const unanswered = fighter(2).picking(LEVEL_1, training);
    expect(offered(unanswered, LEVEL_2)['acrobatic-flourish']).toBe(PrerequisiteStatus.Unmet);
  });

  test('meets a Perception rank at the level a feature raises it, not before', () => {
    expect(offered(fighter(8), BONUS)['eagle-eye']).toBe(PrerequisiteStatus.Met);
    expect(offered(fighter(8), LEVEL_4)['eagle-eye']).toBe(PrerequisiteStatus.Unmet);
  });

  test('meets a skill rank once a skill increase at or below the slot reaches it', () => {
    const raised = fighter(4).picking('skill-increase:3', skillFixtureId('athletics'));
    expect(offered(raised, LEVEL_1)['sudden-charge']).toBe(PrerequisiteStatus.Unmet);
    expect(offered(raised, LEVEL_4)['sudden-charge']).toBe(PrerequisiteStatus.Met);
  });

  test('meets a feat prerequisite with a feat picked at a lower level, not a higher one', () => {
    const earlier = fighter(4).picking(LEVEL_1, idOf('power-attack'));
    expect(offered(earlier, LEVEL_2)['brutish-shove']).toBe(PrerequisiteStatus.Met);
    const later = fighter(4).picking(LEVEL_4, idOf('power-attack'));
    expect(offered(later, LEVEL_2)['brutish-shove']).toBe(PrerequisiteStatus.Unmet);
  });

  test('reads a slot as if empty, so a feat it would replace meets nothing there', () => {
    const holding = fighter(2).picking(LEVEL_2, idOf('power-attack'));
    expect(offered(holding, LEVEL_2)['brutish-shove']).toBe(PrerequisiteStatus.Unmet);
  });

  test("opens a feature's own feat slot at the level the feature is gained, with no prompt", () => {
    const bonus = featSlots(fighter(8).build().document, content).find((slot) => slot.key === BONUS);
    expect(bonus).toMatchObject({ level: 8, prompt: undefined });
    const offers = offered(fighter(8), BONUS);
    expect(Object.keys(offers)).toContain('knockdown');
  });

  test('meets a feat prerequisite with a feat a feature grants, with no pick', () => {
    expect(offered(fighter(8), BONUS)['brutish-shove']).toBe(PrerequisiteStatus.Met);
    expect(offered(fighter(8), LEVEL_4)['brutish-shove']).toBe(PrerequisiteStatus.Unmet);
  });

  test('meets an attribute minimum once the modifier reaches it at the slot level', () => {
    // Strength +1 from the key attribute, +2 with a free boost too.
    const keyed = offered(fighter().picking('boost:1:class:0', 'str'), LEVEL_1);
    const strong = fighter().picking('boost:1:class:0', 'str').picking('boost:1:free:0', 'str');
    expect(keyed['brawn']).toBe(PrerequisiteStatus.Unmet);
    expect(offered(strong, LEVEL_1)['brawn']).toBe(PrerequisiteStatus.Met);
  });
});

describe('characterSlots with feat prerequisites', () => {
  test('a pick whose prerequisites hold is filled', () => {
    const character = fighter(2).picking(LEVEL_1, idOf('power-attack')).picking(LEVEL_2, idOf('brutish-shove'));
    expect(slotOf(character, LEVEL_2)).toMatchObject({ status: SlotStatus.Filled });
  });

  test('a taken feat whose prerequisite stops holding is flagged at its slot with the reason', () => {
    const character = fighter(2).picking(LEVEL_2, idOf('brutish-shove'));
    expect(slotOf(character, LEVEL_2)).toMatchObject({
      status: SlotStatus.Invalid,
      selection: idOf('brutish-shove'),
      reason: { key: SlotInvalidMessage.PrerequisitesNotMet },
    });
  });

  test('a planned feat whose prerequisite fails is flagged at its level', () => {
    const character = fighter(1).picking(LEVEL_4, idOf('sudden-charge'));
    expect(slotOf(character, LEVEL_4)).toMatchObject({
      status: SlotStatus.Invalid,
      level: 4,
      reason: { key: SlotInvalidMessage.PrerequisitesNotMet },
    });
  });

  test('a feat above its slot level is not offered there', () => {
    const character = fighter(10).picking(LEVEL_1, idOf('knockdown'));
    expect(slotOf(character, LEVEL_1)).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: SlotInvalidMessage.NotOffered },
    });
  });

  test('a pick whose prerequisites are unknown stays filled: unknown is never read as not met', () => {
    const character = fighter().picking(LEVEL_1, idOf('reactive-shield'));
    expect(slotOf(character, LEVEL_1)).toMatchObject({ status: SlotStatus.Filled });
  });
});

function refusal(character: CharacterBuilder, slot: SlotKey, feat: FeatSlotFixture): unknown {
  return slotRefusal(character.build().document, content, { slot, selection: ChoiceValue.parse(idOf(feat)) });
}

describe('slotRefusal for feat slots', () => {
  test('takes a feat whose prerequisites are met or unknown', () => {
    expect(refusal(fighter(), LEVEL_1, 'power-attack')).toBeUndefined();
    expect(refusal(fighter(), LEVEL_1, 'reactive-shield')).toBeUndefined();
  });

  test('refuses a feat whose prerequisites are not met at the slot level', () => {
    expect(refusal(fighter(), LEVEL_1, 'sudden-charge')).toEqual({
      field: 'selection',
      message: { key: 'character.validation.prerequisitesNotMet' },
    });
  });

  test('refuses a feat above the slot level, though a higher slot would take it', () => {
    expect(refusal(fighter(10), LEVEL_1, 'knockdown')).toMatchObject({
      message: { key: 'character.validation.selectionNotOffered' },
    });
  });

  test("reads the slot as if empty, so a feat it replaces doesn't count toward its own prerequisites", () => {
    const character = fighter(2).picking(LEVEL_2, idOf('power-attack'));
    expect(refusal(character, LEVEL_2, 'brutish-shove')).toMatchObject({
      message: { key: 'character.validation.prerequisitesNotMet' },
    });
    const earlier = character.picking(LEVEL_1, idOf('power-attack'));
    expect(refusal(earlier, LEVEL_2, 'brutish-shove')).toBeUndefined();
  });
});

describe('withoutPick', () => {
  test('is the document itself for a slot holding no pick, so its cached reads are shared', () => {
    const { document } = fighter(2).build();
    expect(withoutPick(document, LEVEL_2)).toBe(document);
  });

  test('is the document without the pick for a slot holding one, leaving the others', () => {
    const { document } = fighter(2).picking(LEVEL_1, idOf('power-attack')).picking(LEVEL_2, idOf('lunge')).build();
    const { choices } = withoutPick(document, LEVEL_2).build;
    expect(LEVEL_2 in choices).toBe(false);
    expect(choices[LEVEL_1]).toBe(document.build.choices[LEVEL_1]);
    expect(LEVEL_2 in document.build.choices).toBe(true);
  });
});

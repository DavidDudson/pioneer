import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SlotInvalidMessage, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { featSlots, PrerequisiteStatus } from './feat-slots';
import { slotContent, slotRefusal } from './slot-offer';
import { CharacterBuilder, skillFixtureId, skillFixtures } from './testing';

const builder = new ContentPackBuilder().withId('feat-slots');
const idOf = (name: string): string => builder.idOf(ContentKind.Feat, name);
const classId = builder.idOf(ContentKind.Class, 'fighter');

/** A class feat slot at `level`, as the importer writes one (`kind-fields.ts`). */
function classFeatSlot(level: number): object[] {
  const flag = `class-feat-${level}`;
  const predicate = level === 1 ? {} : { predicate: [{ gte: ['self:level', level] }] };
  return [
    {
      key: 'ChoiceSet',
      flag,
      prompt: 'Fighter feat',
      choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
      ...predicate,
    },
    { key: 'GrantItem', item: { choice: flag }, ...predicate },
  ];
}

const FIGHTER = ['fighter'];
const rules = [
  { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' },
  { key: 'Proficiency', selector: 'perception', rank: 'expert' },
  ...classFeatSlot(1),
  ...classFeatSlot(2),
  ...classFeatSlot(4),
];
/** The slot each class feat slot is keyed by: the class and the rule index of its `ChoiceSet`. */
const LEVEL_1 = SlotKey.parse(`${classId}:2`);
const LEVEL_2 = SlotKey.parse(`${classId}:4`);
const LEVEL_4 = SlotKey.parse(`${classId}:6`);

const prerequisites = (text: string): object[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

builder
  .withClass('fighter', ['str'], { rules })
  .withFeat('power-attack', { traits: FIGHTER })
  .withFeat('sudden-charge', {
    traits: FIGHTER,
    data: {
      prerequisites: prerequisites('expert in Athletics'),
      prerequisitePredicate: [{ gte: ['skill:athletics:rank', 2] }],
    },
  })
  .withFeat('reactive-shield', { traits: FIGHTER, data: { prerequisites: prerequisites('an animal companion') } })
  .withFeat('keen-eye', { traits: FIGHTER, data: { prerequisitePredicate: [{ gte: ['perception:rank', 2] }] } })
  .withFeat('brawn', { traits: FIGHTER, data: { prerequisitePredicate: [{ gte: ['attribute:str:mod', 2] }] } })
  .withFeat('brutish-shove', { level: 2, traits: FIGHTER, data: { prerequisitePredicate: ['feat:power-attack'] } })
  .withFeat('lunge', { level: 2, traits: FIGHTER })
  .withFeat('knockdown', { level: 4, traits: FIGHTER })
  .withFeat('assurance');

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(builder.build());
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
    expect(slots.map((slot) => [slot.key, slot.level])).toEqual([
      [LEVEL_1, 1],
      [LEVEL_2, 2],
      [LEVEL_4, 4],
    ]);
  });

  test('offers the feats of its kind up to its own level, however high the character is', () => {
    const atTen = fighter(10);
    expect(Object.keys(offered(atTen, LEVEL_1)).toSorted()).toEqual([
      'brawn',
      'keen-eye',
      'power-attack',
      'reactive-shield',
      'sudden-charge',
    ]);
    expect(Object.keys(offered(atTen, LEVEL_2))).toContain('lunge');
    expect(Object.keys(offered(atTen, LEVEL_4))).toContain('knockdown');
  });

  test('reads each prerequisite as met, not met, or unknown when its text did not parse', () => {
    expect(offered(fighter(), LEVEL_1)).toEqual({
      brawn: PrerequisiteStatus.Unmet,
      'keen-eye': PrerequisiteStatus.Met,
      'power-attack': PrerequisiteStatus.Met,
      'reactive-shield': PrerequisiteStatus.Unknown,
      'sudden-charge': PrerequisiteStatus.Unmet,
    });
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

function refusal(character: CharacterBuilder, slot: SlotKey, feat: string): unknown {
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
    const character = fighter(2).picking(LEVEL_1, idOf('power-attack'));
    expect(refusal(character, LEVEL_2, 'brutish-shove')).toBeUndefined();
    expect(refusal(character, LEVEL_1, 'brawn')).toMatchObject({
      message: { key: 'character.validation.prerequisitesNotMet' },
    });
  });
});

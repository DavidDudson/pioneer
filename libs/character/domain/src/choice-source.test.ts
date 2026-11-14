import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, ContentText } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotSubjectKind } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { characterSlots } from './character-slot-status';
import { ChoiceSourceKind, choiceSourceOf } from './choice-source';
import type { ChoiceSource } from './choice-source';
import { levelTimeline } from './level-timeline';
import { SkillSlotKind } from './skill-training';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
} from './testing';

const archetypes = new ContentPackBuilder().withId('choice-source-archetypes');
const DEDICATION = ContentId.parse(archetypes.idOf(ContentKind.Feat, 'sage-dedication'));

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
registry.register(playerCoreClasses());
registry.register(
  archetypes
    .withFeat('sage-dedication', {
      traits: ['fighter', 'archetype', 'dedication'],
      rules: [
        {
          key: 'ChoiceSet',
          flag: 'skill',
          choices: [{ value: 'arcana', label: 'Arcana' }],
        },
      ],
    })
    .build(),
);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LEVEL_THREE = 3;

/** The source of the slot `key` in the timeline of `builder`'s character. */
function sourceOf(builder: CharacterBuilder, key: string): ChoiceSource | undefined {
  const { document } = builder.build();
  const slot = levelTimeline(document, content)
    .flatMap((row) => row.slots)
    .find((each) => each.key === key);
  return slot && choiceSourceOf(slot, document, content);
}

function isBoost(slot: CharacterSlot): boolean {
  return 'subject' in slot && slot.subject.kind === SlotSubjectKind.Boost;
}

function isSkillIncrease(slot: CharacterSlot): boolean {
  return (
    'subject' in slot && slot.subject.kind === SlotSubjectKind.Skill && slot.subject.source === SkillSlotKind.Increase
  );
}

/** The source kinds of the slots of `document` that `which` picks. */
function sourceKindsOf(document: CharacterDocument, which: (slot: CharacterSlot) => boolean): ChoiceSourceKind[] {
  return characterSlots(document, content)
    .filter((slot) => which(slot))
    .flatMap((slot) => choiceSourceOf(slot, document, content)?.kind ?? []);
}

describe('choice source', () => {
  test('names a martial’s class feat slots after the class', () => {
    const fighter = new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(LEVEL_THREE);
    expect(sourceOf(fighter, FEAT_SLOT_KEYS.level1)).toStrictEqual({
      kind: ChoiceSourceKind.Class,
      name: ContentText.parse('Fighter'),
    });
    expect(sourceOf(fighter, FEAT_SLOT_KEYS.level4)?.kind).toBe(ChoiceSourceKind.Class);
  });

  test('gives the class slot itself the class as its source, and skill increases general progression', () => {
    const fighter = new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(LEVEL_THREE);
    expect(sourceOf(fighter, 'class')?.kind).toBe(ChoiceSourceKind.Class);
    const { document } = fighter.build();
    const kinds = sourceKindsOf(document, (slot) => isSkillIncrease(slot));
    expect(kinds.length).toBeGreaterThan(0);
    expect(new Set(kinds)).toStrictEqual(new Set([ChoiceSourceKind.General]));
  });

  test('names a caster’s spell slots as spellcasting of its class', () => {
    const bard = new CharacterBuilder().named('bard').picking('class', playerCoreClassId('bard')).atLevel(LEVEL_THREE);
    expect(sourceOf(bard, 'repertoire:bard:1:0')).toMatchObject({ kind: ChoiceSourceKind.Spellcasting });
    expect(sourceOf(bard, 'signature:bard:1')?.kind).toBe(ChoiceSourceKind.Spellcasting);
    expect(sourceOf(bard, 'repertoire:bard:cantrip:0')?.name).toBeDefined();
  });

  test('gives a dedication’s own choices the archetype as their source', () => {
    const multiclass = new CharacterBuilder()
      .picking('class', FEAT_SLOT_FIGHTER)
      .picking(FEAT_SLOT_KEYS.level1, DEDICATION)
      .atLevel(LEVEL_THREE);
    expect(sourceOf(multiclass, `${DEDICATION}:0`)).toMatchObject({
      kind: ChoiceSourceKind.Archetype,
    });
  });

  test('gives a boost its source and a free boost general progression', () => {
    const { document } = new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(LEVEL_THREE).build();
    const kinds = sourceKindsOf(document, (slot) => isBoost(slot));
    expect(kinds).toContain(ChoiceSourceKind.Ancestry);
    expect(kinds).toContain(ChoiceSourceKind.General);
  });
});

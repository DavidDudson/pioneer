import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SkillTrainingSourceKind } from './skill-trained';
import type { SkillTrainingSource } from './skill-trained';
import { skillSlots } from './skill-training';
import { skillReads, slotContent } from './slot-offer';
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

/** A skill a trained skill slot can't offer, by id, with its sources. */
interface TrainedRead {
  readonly skill: ChoiceValue;
  readonly sources: readonly SkillTrainingSource[];
}

function trainedAt(builder: CharacterBuilder, slot: string): readonly TrainedRead[] {
  const { document } = builder.build();
  const found = skillSlots(document, skillReads(document, content)).find((each) => each.key === slot);
  return (found?.trained ?? []).map(({ skill: each, sources }) => ({
    skill: each.id,
    sources,
  }));
}

describe('skills a trained skill slot cannot offer', () => {
  test('name every grant that trains a skill, the class and the background alike', () => {
    const cleric = as('cleric').picking('background', acolyte);

    const [religion, ...rest] = trainedAt(cleric, 'skill-training:1:0');

    expect(rest).toEqual([]);
    expect(religion?.skill).toBe(skill('religion'));
    expect(religion?.sources).toContainEqual({
      kind: SkillTrainingSourceKind.Entry,
      entry: playerCoreClassId('cleric'),
    });
    expect(religion?.sources).toContainEqual({
      kind: SkillTrainingSourceKind.Entry,
      entry: ContentId.parse(acolyte),
    });
  });

  test('name the earlier slot that took a skill', () => {
    const cleric = as('cleric').picking('skill-training:1:0', skill('athletics'));

    expect(trainedAt(cleric, 'skill-training:1:1')).toContainEqual({
      skill: skill('athletics'),
      sources: [
        {
          kind: SkillTrainingSourceKind.Slot,
          slot: SlotKey.parse('skill-training:1:0'),
        },
      ],
    });
    expect(trainedAt(cleric, 'skill-training:1:0').map(({ skill: each }) => each)).not.toContain(skill('athletics'));
  });

  test('leave out a skill increase that only raised a trained skill, which did not train it', () => {
    const fighter = as('fighter')
      .atLevel(5)
      .picking('boost:5:free:0', 'int')
      .picking('skill-training:1:0', skill('athletics'))
      .picking('skill-increase:3', skill('athletics'));

    expect(trainedAt(fighter, 'skill-training:5:0')).toContainEqual({
      skill: skill('athletics'),
      sources: [{ kind: SkillTrainingSourceKind.Slot, slot: SlotKey.parse('skill-training:1:0') }],
    });
  });

  test('name a skill an increase trained, as the increase', () => {
    const fighter = as('fighter')
      .atLevel(5)
      .picking('boost:5:free:0', 'int')
      .picking('skill-increase:3', skill('medicine'));

    expect(trainedAt(fighter, 'skill-training:5:0')).toContainEqual({
      skill: skill('medicine'),
      sources: [{ kind: SkillTrainingSourceKind.Slot, slot: SlotKey.parse('skill-increase:3') }],
    });
  });

  test('are none for a skill increase, which may raise a trained skill', () => {
    const fighter = as('fighter').atLevel(3).picking('skill-training:1:0', skill('athletics'));

    expect(trainedAt(fighter, 'skill-increase:3')).toEqual([]);
  });
});

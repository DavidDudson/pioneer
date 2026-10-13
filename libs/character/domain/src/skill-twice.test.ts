import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SkillTrainingSourceKind } from './skill-trained';
import type { SkillTrainingSource } from './skill-trained';
import { skillsTrainedTwice } from './skill-twice';
import { slotContent } from './slot-reads';
import { CharacterBuilder, playerCoreClassId, playerCoreClasses, skillFixtureId, skillFixtures } from './testing';

const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const backgrounds = new ContentPackBuilder()
  .withId('twice-backgrounds')
  .withBackground('acolyte', [ALL], [{ key: 'Proficiency', selector: 'skill:religion', rank: 'trained' }])
  .withBackground('adept', [ALL], [{ key: 'Proficiency', selector: 'skill:religion', rank: 'expert' }])
  .build();
const acolyte = new ContentPackBuilder().withId('twice-backgrounds').idOf(ContentKind.Background, 'acolyte');

const adept = new ContentPackBuilder().withId('twice-backgrounds').idOf(ContentKind.Background, 'adept');

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
registry.register(backgrounds);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function cleric(): CharacterBuilder {
  return new CharacterBuilder()
    .named('cleric')
    .picking('class', playerCoreClassId('cleric'))
    .picking('boost:1:class:0', 'wis');
}

/** A skill trained twice, by id, with its sources. */
interface TwiceRead {
  readonly skill: ContentId;
  readonly sources: readonly SkillTrainingSource[];
}

function twice(builder: CharacterBuilder): TwiceRead[] {
  return skillsTrainedTwice(builder.build().document, content).map(({ skill, sources }) => ({
    skill: skill.id,
    sources,
  }));
}

describe('skills trained twice', () => {
  test('name both entries that train a skill', () => {
    const [religion, ...rest] = twice(cleric().picking('background', acolyte));

    expect(rest).toEqual([]);
    expect(religion?.skill).toBe(skillFixtureId('religion'));
    expect(religion?.sources).toHaveLength(2);
    expect(religion?.sources).toContainEqual({
      kind: SkillTrainingSourceKind.Entry,
      entry: playerCoreClassId('cleric'),
    });
    expect(religion?.sources).toContainEqual({ kind: SkillTrainingSourceKind.Entry, entry: ContentId.parse(acolyte) });
  });

  test('name an entry and the slot whose pick names the same skill', () => {
    const religion = skillFixtureId('religion');
    const [read] = twice(cleric().picking('skill-training:1:0', religion));

    expect(read?.sources).toEqual([
      { kind: SkillTrainingSourceKind.Entry, entry: playerCoreClassId('cleric') },
      { kind: SkillTrainingSourceKind.Slot, slot: SlotKey.parse('skill-training:1:0') },
    ]);
  });

  test('are none for a skill trained once', () => {
    const athletics = skillFixtureId('athletics');

    expect(twice(cleric().picking('skill-training:1:0', athletics))).toEqual([]);
  });

  test('are none where a second entry raises the skill past trained', () => {
    expect(twice(cleric().picking('background', adept))).toEqual([]);
  });
});

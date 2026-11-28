import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtureId,
  skillFixtures,
} from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, ContentRegistry, Proficiency } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { PathbuilderName } from './import-kind';
import { placeSkills } from './skill-placement';
import type { SkillRanks } from './skill-placement';

const registry = new ContentRegistry();

registry.register(playerCoreClasses());

registry.register(skillFixtures());

/** Skills Natural Skill offers, each only while the character is untrained in it, as the Player Core feat does. */
const NATURAL_SKILLS = ['acrobatics', 'athletics', 'stealth'] as const;

const naturalPack = new ContentPackBuilder().withId('natural-skill');

naturalPack
  .withFeat('natural-skill', {
    rules: [
      { key: 'Proficiency', selector: { choice: 'skill-one', prefix: 'skill' }, rank: 'trained' },
      {
        key: 'ChoiceSet',
        flag: 'skill-one',
        prompt: 'Skill',
        choices: NATURAL_SKILLS.map((skill) => ({
          value: skill,
          label: skill.replace(/^./u, (letter) => letter.toUpperCase()),
          predicate: [`skill:${skill}:rank:0`],
        })),
      },
    ],
  })
  .withClass('naturalist', ['str'], {
    rules: [{ key: 'GrantItem', item: naturalPack.idOf(ContentKind.Feat, 'natural-skill') }],
  });

registry.register(naturalPack.build());

const naturalSkill = naturalPack.idOf(ContentKind.Feat, 'natural-skill');

const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

/** A fighter of `level` with a key attribute; the class decides how many trained skill slots there are. */
function fighter(level: number): CharacterDocument {
  return new CharacterBuilder()
    .picking('class', playerCoreClassId('fighter'))
    .picking('boost:1:class:0', 'str')
    .atLevel(level)
    .build().document;
}

function ranks(skills: SkillRanks['skills'], lores: SkillRanks['lores'] = []): SkillRanks {
  return { skills, lores };
}

/** A level 1 character of the class that is granted Natural Skill, which has no skill slot of its own. */
function naturalist(): CharacterDocument {
  return new CharacterBuilder()
    .picking('class', ContentId.parse(naturalPack.idOf(ContentKind.Class, 'naturalist')))
    .picking('boost:1:class:0', 'str')
    .atLevel(1)
    .build().document;
}

describe('placeSkills', () => {
  test('trains the skills the export ranks and raises one as far as the increases reach', () => {
    const document = fighter(5);

    const { choices, gaps } = placeSkills(
      document,
      content,
      ranks({ athletics: Proficiency.Expert, acrobatics: Proficiency.Trained }),
    );

    const picked = Object.values(choices);
    expect(picked).toContain(skillFixtureId('athletics'));
    expect(picked).toContain(skillFixtureId('acrobatics'));
    expect(picked.filter((pick) => pick === skillFixtureId('athletics'))).toHaveLength(2);
    expect(gaps).toStrictEqual([]);
  });

  test('reports a rank no slot reaches, with the rank it got', () => {
    const { gaps } = placeSkills(fighter(1), content, ranks({ athletics: Proficiency.Master }));
    expect(gaps).toStrictEqual([
      { name: PathbuilderName.parse('Athletics'), wanted: Proficiency.Master, reached: Proficiency.Trained },
    ]);
  });

  test('a Lore the content defines is trained like a skill', () => {
    const lores = [{ name: PathbuilderName.parse('Scribing'), rank: Proficiency.Trained }];
    const { choices, lores: named, gaps } = placeSkills(fighter(3), content, ranks({}, lores));
    expect(Object.values(choices)).toContain(skillFixtureId('scribing-lore'));
    expect(Object.keys(named)).toStrictEqual([]);
    expect(gaps).toStrictEqual([]);
  });

  test('a Lore the content does not define is picked as a custom Lore, named as the export names it', () => {
    const lores = [{ name: PathbuilderName.parse('Sailing'), rank: Proficiency.Trained }];
    const { choices, lores: named, gaps } = placeSkills(fighter(1), content, ranks({}, lores));
    expect(Object.values(choices).map(String)).toStrictEqual(['lore:sailing']);
    expect(Object.entries(named).map(([topic, name]) => `${topic}=${name}`)).toStrictEqual(['sailing=Sailing']);
    expect(gaps).toStrictEqual([]);
  });

  test('a custom Lore the slots cannot raise far enough is a gap with the rank it got', () => {
    const lores = [{ name: PathbuilderName.parse('Enchantment'), rank: Proficiency.Master }];
    const { gaps } = placeSkills(fighter(3), content, ranks({}, lores));
    expect(gaps).toEqual([
      { name: PathbuilderName.parse('Enchantment'), wanted: Proficiency.Master, reached: Proficiency.Expert },
    ]);
  });

  test('a Lore whose name makes no topic is a gap with no rank', () => {
    const lores = [{ name: PathbuilderName.parse('???'), rank: Proficiency.Trained }];
    const { choices, gaps } = placeSkills(fighter(3), content, ranks({}, lores));
    expect(choices).toStrictEqual({});
    expect(gaps).toEqual([{ name: PathbuilderName.parse('???'), wanted: Proficiency.Trained }]);
  });

  test('fills no slot for untrained ranks', () => {
    const { choices, gaps } = placeSkills(fighter(5), content, ranks({ athletics: Proficiency.Untrained }));
    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([]);
  });

  test("answers a granted feat's skill choice with a skill the slots did not reach", () => {
    const trained = ranks({
      acrobatics: Proficiency.Trained,
      athletics: Proficiency.Trained,
      stealth: Proficiency.Trained,
      crafting: Proficiency.Trained,
    });

    const { choices, gaps } = placeSkills(naturalist(), content, trained);
    const answers = Object.keys(choices).filter((key) => key.startsWith(naturalSkill));
    expect(Object.keys(choices)).toHaveLength(4);
    expect(answers).toHaveLength(1);
    expect(gaps).toStrictEqual([]);
  });

  test("leaves a granted feat's skill choice open when the slots reach every skill", () => {
    const { choices } = placeSkills(naturalist(), content, ranks({ athletics: Proficiency.Trained }));
    expect(Object.keys(choices).filter((key) => key.startsWith(naturalSkill))).toStrictEqual([]);
  });
});

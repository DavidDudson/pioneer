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
import { ContentRegistry, Proficiency } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { PathbuilderName } from './import-kind';
import { placeSkills } from './skill-placement';
import type { SkillRanks } from './skill-placement';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
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

  test('a Lore the content defines is trained like a skill; one it does not is a gap with no rank', () => {
    const lores = [
      { name: PathbuilderName.parse('Scribing'), rank: Proficiency.Trained },
      { name: PathbuilderName.parse('Enchantment'), rank: Proficiency.Master },
    ];
    const { choices, gaps } = placeSkills(fighter(3), content, ranks({}, lores));
    expect(Object.values(choices)).toContain(skillFixtureId('scribing-lore'));
    expect(gaps).toEqual([{ name: PathbuilderName.parse('Enchantment'), wanted: Proficiency.Master }]);
  });

  test('fills no slot for untrained ranks', () => {
    const { choices, gaps } = placeSkills(fighter(5), content, ranks({ athletics: Proficiency.Untrained }));
    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([]);
  });
});

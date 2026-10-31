import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import type { SkillContent } from '../skill-content';

/** No skills and no classes: skill slots never open. For tests about other slots. */
export const NO_SKILLS: SkillContent = { skills: [], skill: () => undefined, classSkills: () => undefined };

const SKILL_PACK = 'skill-fixtures';

/** Player Core's sixteen skills. */
const SKILLS = [
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
] as const;
export type SkillFixture = (typeof SKILLS)[number] | 'scribing-lore';

/** The id of a skill's statistic in `skillFixtures`: `athletics`, `scribing-lore`. */
export function skillFixtureId(name: SkillFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(SKILL_PACK), EntrySlug.parse(`statistic:${name}`)));
}

/** A pack of Player Core's skills as statistics (`skill:athletics`), and Scribing Lore (`skill:lore:scribing`). */
export function skillFixtures(): ContentPack {
  const builder = new ContentPackBuilder().withId(SKILL_PACK);
  for (const skill of SKILLS) {
    builder.withStatistic(skill, { selector: `skill:${skill}`, domains: ['skill-check'] });
  }
  return builder
    .withStatistic('scribing-lore', {
      name: 'Scribing Lore',
      selector: 'skill:lore:scribing',
      domains: ['skill-check'],
    })
    .build();
}

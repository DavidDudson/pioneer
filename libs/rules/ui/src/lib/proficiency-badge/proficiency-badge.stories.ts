import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Proficiency } from '@pioneer/rules/sdk';

import { ProficiencyBadge } from './proficiency-badge.component';

type ProficiencyBadgeStory = StoryObj<ProficiencyBadge>;

const meta: Meta<ProficiencyBadge> = {
  title: 'Rules/Proficiency badge',
  component: ProficiencyBadge,
};
export default meta;

/** No source known: the plain letter, with nothing to open. */
export const Plain: ProficiencyBadgeStory = { args: { rank: Proficiency.Trained } };

/** Hover or focus the letter: what gave the rank. */
export const WithSource: ProficiencyBadgeStory = {
  args: { rank: Proficiency.Trained, sources: [{ rank: Proficiency.Trained, source: 'Cleric', future: false }] },
};

/** Ranks still to come are listed in grey with their level. */
export const WithFutureRanks: ProficiencyBadgeStory = {
  args: {
    rank: Proficiency.Trained,
    sources: [
      { rank: Proficiency.Trained, source: 'Level 1 trained skill 1', future: false },
      { rank: Proficiency.Expert, source: 'Level 5 skill increase', level: 5, future: true },
      { rank: Proficiency.Master, source: 'Level 7 skill increase', level: 7, future: true },
    ],
  },
};

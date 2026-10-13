import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Proficiency } from '@pioneer/rules/sdk';

import { ProficiencyRankView } from './proficiency-rank.component';

type ProficiencyRankStory = StoryObj<ProficiencyRankView>;

const meta: Meta<ProficiencyRankView> = {
  title: 'Rules/Proficiency rank',
  component: ProficiencyRankView,
};
export default meta;

/** Untrained: "U", read out as "Untrained". */
export const Untrained: ProficiencyRankStory = { args: { rank: Proficiency.Untrained } };

/** Trained: "T". */
export const Trained: ProficiencyRankStory = { args: { rank: Proficiency.Trained } };

/** Legendary: "L". */
export const Legendary: ProficiencyRankStory = { args: { rank: Proficiency.Legendary } };

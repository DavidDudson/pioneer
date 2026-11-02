import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { ConditionList } from './condition-list.component';
import { ConditionSlug } from './condition-seriousness';

type ConditionListStory = StoryObj<ConditionList>;

const meta: Meta<ConditionList> = {
  title: 'Rules/Condition list',
  component: ConditionList,
  args: {
    conditions: [
      { slug: ConditionSlug.Prone },
      { slug: ConditionSlug.Frightened, value: 2 },
      { slug: ConditionSlug.Dying, value: 1 },
    ],
  },
};
export default meta;

/** Most serious first, each with its value when it has one. */
export const Several: ConditionListStory = {};

/** At or below half Hit Points, a Bloodied line leads. */
export const Bloodied: ConditionListStory = { args: { bloodied: true } };

/** Nothing to list: the list says so. */
export const None: ConditionListStory = { args: { conditions: [] } };

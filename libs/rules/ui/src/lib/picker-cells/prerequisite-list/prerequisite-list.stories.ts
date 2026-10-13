import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { PrerequisiteList } from './prerequisite-list.component';

type PrerequisiteStory = StoryObj<PrerequisiteList>;

const meta: Meta<PrerequisiteList> = { title: 'Rules/Picker cells/Prerequisites', component: PrerequisiteList };
export default meta;

/** One met, one not. */
export const Mixed: PrerequisiteStory = {
  args: {
    prerequisites: [
      { label: 'Trained in Athletics', met: true },
      { label: 'Strength 16', met: false },
    ],
  },
};

/** All met. */
export const AllMet: PrerequisiteStory = { args: { prerequisites: [{ label: 'Trained in Stealth', met: true }] } };

/** None. */
export const None: PrerequisiteStory = { args: { prerequisites: [] } };

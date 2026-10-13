import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { PrerequisiteList, PrerequisiteState } from './prerequisite-list.component';

type PrerequisiteStory = StoryObj<PrerequisiteList>;

const meta: Meta<PrerequisiteList> = { title: 'Rules/Picker cells/Prerequisites', component: PrerequisiteList };
export default meta;

/** One met, one not. */
export const Mixed: PrerequisiteStory = {
  args: {
    prerequisites: [
      { label: 'Trained in Athletics', state: PrerequisiteState.Met },
      { label: 'Strength 16', state: PrerequisiteState.Unmet },
    ],
  },
};

/** All met. */
export const AllMet: PrerequisiteStory = {
  args: { prerequisites: [{ label: 'Trained in Stealth', state: PrerequisiteState.Met }] },
};

/** One that can't be checked: neither met nor unmet. */
export const Unknown: PrerequisiteStory = {
  args: { prerequisites: [{ label: 'Worships a deity of magic', state: PrerequisiteState.Unknown }] },
};

/** None. */
export const None: PrerequisiteStory = { args: { prerequisites: [] } };

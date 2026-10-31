import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { ConditionBadge } from './condition-badge.component';
import { ConditionSlug } from './condition-seriousness';

type ConditionBadgeStory = StoryObj<ConditionBadge>;

const meta: Meta<ConditionBadge> = {
  title: 'Rules/Condition badge',
  component: ConditionBadge,
  args: { conditions: [ConditionSlug.Frightened] },
};
export default meta;

export const One: ConditionBadgeStory = {};

/** The most serious shows, and the count says there are more. */
export const Several: ConditionBadgeStory = {
  args: { conditions: [ConditionSlug.Prone, ConditionSlug.Dying, ConditionSlug.Frightened] },
};

/** No conditions: nothing is drawn. */
export const None: ConditionBadgeStory = { args: { conditions: [] } };

/** A homebrew condition gets the generic icon. */
export const Homebrew: ConditionBadgeStory = { args: { conditions: ['homebrew-curse'] } };

/** Every remaster condition's icon, most serious first. */
export const Every: ConditionBadgeStory = {
  render: () => ({
    props: { slugs: Object.values(ConditionSlug) },
    template: `@for (slug of slugs; track slug) { <pio-condition-badge [conditions]="[slug]" /> }`,
  }),
};

import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Attribute } from '@pioneer/rules/sdk';

import { AttributeBoosts } from './attribute-boosts.component';

type BoostsStory = StoryObj<AttributeBoosts>;

const meta: Meta<AttributeBoosts> = { title: 'Rules/Picker cells/Attribute boosts', component: AttributeBoosts };
export default meta;

/** A fixed boost, a choice and a free boost, as an ancestry gives them. */
export const Ancestry: BoostsStory = {
  args: {
    boosts: [[Attribute.Constitution], [Attribute.Strength, Attribute.Dexterity], Object.values(Attribute)],
  },
};

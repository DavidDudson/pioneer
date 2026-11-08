import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import { FIGHTER_CHECKS } from '../testing/attributes-fixtures';
import { AttributeRolls } from './attribute-rolls.component';

type AttributeRollsStory = StoryObj<AttributeRolls>;

const meta: Meta<AttributeRolls> = {
  title: 'Rules/Attribute rolls',
  component: AttributeRolls,
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: { roll: () => undefined } }] })],
};
export default meta;

/** While the statistics the checks come from load. */
export const Loading: AttributeRollsStory = {
  args: { statistics: undefined },
};

/** Each modifier is a roll button that rolls that attribute's check. */
export const Fighter: AttributeRollsStory = {
  args: { statistics: FIGHTER_CHECKS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Roll Strength +4' })).toBeVisible();
  },
};

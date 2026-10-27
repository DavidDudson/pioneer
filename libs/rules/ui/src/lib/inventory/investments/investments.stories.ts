import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { INVESTMENT_LIMIT, INVESTMENTS, TEN_INVESTMENTS } from '../../testing/investment-fixtures';
import { InvestmentsView } from './investments.component';

type InvestmentsStory = StoryObj<InvestmentsView>;

const meta: Meta<InvestmentsView> = {
  title: 'Rules/Investments',
  component: InvestmentsView,
  args: { maximum: INVESTMENT_LIMIT },
};
export default meta;

/** While the character loads. */
export const Loading: InvestmentsStory = {
  args: { investments: undefined },
};

/** Nothing invested. */
export const Empty: InvestmentsStory = {
  args: { investments: [] },
};

/** What each investment turns on: lines that count, one beaten by a better bonus, nothing shown, and one taken off. */
export const Invested: InvestmentsStory = {
  args: { investments: INVESTMENTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('4 of 10 invested')).toBeVisible();
    await expect(canvas.getByText('Perception +1 item')).toBeVisible();
    await expect(canvas.getByText('Not worn or held, so it does nothing.')).toBeVisible();
  },
};

/** At the limit of ten. */
export const Full: InvestmentsStory = {
  args: { investments: TEN_INVESTMENTS },
};

/** In a battle form: the worn investments are melded into it, and still turn on what they do. */
export const Melded: InvestmentsStory = {
  args: {
    investments: INVESTMENTS.map(({ id, name, working, effects }) => ({ id, name, working, effects, melded: working })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Melded into your form/u)[0]).toBeVisible();
  },
};

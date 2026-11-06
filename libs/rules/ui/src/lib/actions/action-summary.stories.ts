import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ActionCost, RichText } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { SHIELD_BLOCK_SUMMARY } from '../testing/action-fixtures';
import { ActionSummary } from './action-summary.component';

type ActionSummaryStory = StoryObj<ActionSummary>;

const meta: Meta<ActionSummary> = {
  title: 'Rules/Action Summary',
  component: ActionSummary,
};
export default meta;

/** A reaction: its cost, trigger, requirements and the opening of its effect. */
export const Reaction: ActionSummaryStory = {
  args: { action: SHIELD_BLOCK_SUMMARY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Trigger')).toBeVisible();
    await expect(canvas.getByText('Requirements')).toBeVisible();
  },
};

/** An action that cannot be used now says why, under its effect. */
export const Unavailable: ActionSummaryStory = {
  args: { action: { ...SHIELD_BLOCK_SUMMARY, reasons: ['You have no shield raised.'] } },
};

/** An action with no cost, trigger or requirements shows its traits and effect alone. */
export const Plain: ActionSummaryStory = {
  args: {
    action: {
      ...SHIELD_BLOCK_SUMMARY,
      line: { ...SHIELD_BLOCK_SUMMARY.line, cost: ActionCost.Free, trigger: undefined, requirements: undefined },
      costIcon: undefined,
      reasons: [],
    },
  },
};

export const NoEffect: ActionSummaryStory = {
  args: { action: { ...SHIELD_BLOCK_SUMMARY, line: { ...SHIELD_BLOCK_SUMMARY.line, effect: RichText.parse([]) } } },
};

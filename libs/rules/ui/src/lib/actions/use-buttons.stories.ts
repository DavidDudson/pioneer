import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ActionCost, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import type { UsableLine } from './action-user';
import { ActionUser } from './action-user';
import { UseButtons } from './use-buttons.component';

type UseButtonsStory = StoryObj<UseButtons>;

const LONGSWORD = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('equipment:longsword')));

/** A line that costs `cost`, which the turn can pay unless `affordable` says it cannot. */
function line(cost: ActionCost | undefined, rest: Partial<UsableLine> = {}): UsableLine {
  return { id: LONGSWORD, name: 'Longsword', cost, ...rest };
}

const meta: Meta<UseButtons> = {
  title: 'Rules/Use Buttons',
  component: UseButtons,
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: ActionUser,
          useValue: {
            use: async (): Promise<void> => {
              await Promise.resolve();
            },
          },
        },
      ],
    }),
  ],
};
export default meta;

/** A fixed cost: one Use button. */
export const Fixed: UseButtonsStory = {
  args: { line: line(ActionCost.One) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Use' })).toBeVisible();
  },
};

/** A variable cost: a button for each count of actions, fewest first. */
export const Variable: UseButtonsStory = {
  args: { line: line(ActionCost.One, { upTo: 3 }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Use for 1 action' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Use for 3 actions' })).toBeVisible();
  },
};

/** With two actions left only the counts the turn can pay for show. */
export const CappedByTheTurn: UseButtonsStory = {
  args: { line: line(ActionCost.One, { upTo: 3, affordable: true, affordableUpTo: 2 }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Use for 2 actions' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Use for 3 actions' })).toBeNull();
  },
};

/** Too dear for the actions left: nothing to press. */
export const OutOfReach: UseButtonsStory = {
  args: { line: line(ActionCost.Two, { affordable: false }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};

/** An activation with no cost in the content still logs and records its use when it has a payment. */
export const PaymentOnly: UseButtonsStory = {
  args: { line: line(undefined, { payment: { use: 'boots:take-to-the-skies' } }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Use' })).toBeVisible();
  },
};

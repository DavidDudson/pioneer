import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { pressKeys } from '../../testing/story-keyboard';
import { TabList } from './tab-list.component';

type TabListStory = StoryObj<TabList<string>>;

/**
 * Tabs that switch what one page shows, as a `tablist`. The chosen tab is underlined and `aria-selected`; the row is
 * one Tab stop and scrolls sideways when the tabs outgrow it.
 */
const meta: Meta<TabList<string>> = {
  title: 'Actions/TabList',
  component: TabList,
  parameters: { layout: 'padded' },
  args: {
    label: 'Kinds of action',
    value: 'spells',
    options: [
      { value: 'strikes', label: 'Strikes' },
      { value: 'spells', label: 'Spells' },
      { value: 'innate', label: 'Innate' },
      { value: 'items', label: 'Items' },
    ],
  },
};
export default meta;

export const Default: TabListStory = {};

/** Arrow keys move focus along the tabs; Enter chooses the focused one. Runs only in `nx test-storybook frontier`. */
export const Keyboard: TabListStory = {
  tags: ['!dev'],
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('tab', { name: 'Spells' })).toHaveFocus();
    await pressKeys('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Innate' })).toHaveFocus();
    await expect(canvas.getByRole('tab', { name: 'Spells' })).toHaveAttribute('aria-selected', 'true');
    await pressKeys('{Enter}');
    await expect(canvas.getByRole('tab', { name: 'Innate' })).toHaveAttribute('aria-selected', 'true');
  },
};

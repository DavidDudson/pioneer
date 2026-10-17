import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { pressKeys } from '../../testing/story-keyboard';
import { Pips } from './pips.component';

type PipsStory = StoryObj<Pips>;

/** A count of points as one toggle per point: hero points, focus points. */
const meta: Meta<Pips> = {
  title: 'Controls/Pips',
  component: Pips,
  argTypes: { committed: { action: 'committed' } },
  args: { max: 3, value: 1, ariaLabel: 'Hero Points', disabled: false, invalid: false },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-pips ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const OneOfThree: PipsStory = {};

export const Full: PipsStory = { args: { value: 3 } };

export const Empty: PipsStory = { args: { value: 0 } };

export const FocusPool: PipsStory = { args: { max: 6, value: 4, ariaLabel: 'Focus Points' } };

export const Disabled: PipsStory = { args: { disabled: true } };

/**
 * Pressing an empty pip fills up to it; pressing the last filled pip empties it. Arrow keys move focus between pips
 * without pressing. Runs in `nx test-storybook frontier`.
 */
export const Interaction: PipsStory = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const pip = (place: number): HTMLElement => canvas.getByRole('button', { name: `Hero Points ${place}` });
    await expect(pip(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(pip(2)).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pip(3));
    await waitFor(async () => {
      await expect(pip(3)).toHaveAttribute('aria-pressed', 'true');
    });
    await expect(pip(2)).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pip(3));
    await waitFor(async () => {
      await expect(pip(3)).toHaveAttribute('aria-pressed', 'false');
    });
    await expect(pip(2)).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Tab lands on the last filled pip; the arrow keys and Home and End move focus without pressing. */
export const Keyboard: PipsStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const pip = (place: number): HTMLElement => canvas.getByRole('button', { name: `Hero Points ${place}` });
    await userEvent.tab();
    await expect(pip(1)).toHaveFocus();
    await pressKeys('{ArrowRight}');
    await expect(pip(2)).toHaveFocus();
    await pressKeys('{End}');
    await expect(pip(3)).toHaveFocus();
    await expect(pip(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(pip(3)).toHaveAttribute('aria-pressed', 'false');
  },
};

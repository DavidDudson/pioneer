import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { pressKeys } from '../../testing/story-keyboard';
import type { SelectOption } from '../select/select.component';
import { Segmented } from './segmented.component';

type Unit = 'feet' | 'metres';
type Proficiency = 'trained' | 'expert' | 'master';

type SegmentedStory = StoryObj<Segmented<string>>;

const UNITS: readonly SelectOption<Unit>[] = [
  { value: 'feet', label: 'Feet' },
  { value: 'metres', label: 'Metres' },
];

const PROFICIENCIES: readonly SelectOption<Proficiency>[] = [
  { value: 'trained', label: 'Trained' },
  { value: 'expert', label: 'Expert' },
  { value: 'master', label: 'Master' },
];

/** Single-select for two or three options. Prefer `fr-select` for four or more. */
const meta: Meta<Segmented<string>> = {
  title: 'Controls/Segmented',
  component: Segmented,
  argTypes: { committed: { action: 'committed' } },
  args: { options: UNITS, value: 'feet', ariaLabel: 'Distance unit', disabled: false, invalid: false },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-segmented ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const TwoOptions: SegmentedStory = {};

export const ThreeOptions: SegmentedStory = {
  args: { options: PROFICIENCIES, value: 'expert', ariaLabel: 'Proficiency' },
};

export const NothingChosen: SegmentedStory = { args: { value: undefined } };

export const Disabled: SegmentedStory = { args: { disabled: true } };

export const Invalid: SegmentedStory = { args: { value: undefined, invalid: true } };

/** Presses `keys` for real and expects `option` to have focus after them. */
async function expectFocusAfter(keys: string, option: HTMLElement): Promise<void> {
  await pressKeys(keys);
  await expect(option).toHaveFocus();
}

/**
 * Keyboard: Tab lands on the chosen option, the arrow keys, Home and End move focus (wrapping) without picking,
 * Enter picks the focused option. Runs only in `nx test-storybook frontier`.
 */
export const Keyboard: SegmentedStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  args: { options: PROFICIENCIES, value: 'expert', ariaLabel: 'Proficiency' },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const option = (name: string): HTMLElement => canvas.getByRole('button', { name });
    await userEvent.tab();
    await expect(option('Expert')).toHaveFocus();
    await expectFocusAfter('{ArrowRight}', option('Master'));
    await expectFocusAfter('{ArrowRight}', option('Trained'));
    await expectFocusAfter('{End}', option('Master'));
    await expect(option('Expert')).toHaveAttribute('aria-pressed', 'true');
    await pressKeys('{Home}{Enter}');
    await waitFor(async () => {
      await expect(option('Trained')).toHaveAttribute('aria-pressed', 'true');
    });
  },
};

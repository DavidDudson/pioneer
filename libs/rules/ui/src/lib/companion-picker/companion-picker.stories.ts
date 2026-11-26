import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { CompanionPicker } from './companion-picker.component';
import type { CompanionSpeciesOption } from './companion-picker.component';

type CompanionPickerStory = StoryObj<CompanionPicker>;

const SPECIES: readonly CompanionSpeciesOption[] = [
  { value: 'companion:bear', label: 'Bear' },
  { value: 'companion:wolf', label: 'Wolf' },
  { value: 'companion:horse', label: 'Horse' },
];

const meta: Meta<CompanionPicker> = {
  title: 'Rules/Companion picker',
  component: CompanionPicker,
  args: { source: 'Animal Companion', options: SPECIES, picked: undefined, name: '' },
};

export default meta;

/** Nothing chosen yet: the species are listed, and the pick cannot be confirmed. */
export const Choosing: CompanionPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Animal Companion: choose a companion')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Choose companion' })).toBeDisabled();
  },
};

/** A species and a name: the pick can be confirmed. */
export const Ready: CompanionPickerStory = {
  args: { picked: 'companion:wolf', name: 'Ash' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Choose companion' })).toBeEnabled();
  },
};

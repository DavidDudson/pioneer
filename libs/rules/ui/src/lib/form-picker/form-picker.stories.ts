import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { FormPicker } from './form-picker.component';
import type { FormPickerOption, FormPreview } from './form-picker.component';

type FormPickerStory = StoryObj<FormPicker>;

const FORMS: readonly FormPickerOption[] = [
  { value: 'animal-form:bear', label: 'Bear' },
  { value: 'animal-form:ape', label: 'Ape' },
  { value: 'animal-form:cat', label: 'Cat' },
];

const BEAR: FormPreview = {
  rows: [
    { name: 'Armor Class', own: '19', form: '22' },
    { name: 'Land Speed', own: '25 feet', form: '30 feet' },
    { name: 'Size', own: 'Medium', form: 'Large' },
  ],
};

const meta: Meta<FormPicker> = {
  title: 'Rules/Form picker',
  component: FormPicker,
  args: {
    spell: 'Animal Form',
    options: FORMS,
    picked: undefined,
    preview: undefined,
    confirm: async () => undefined,
  },
};
export default meta;

/** Nothing picked yet: the forms are listed, and the spell cannot be cast. */
export const Choosing: FormPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Cast Animal Form: choose a form')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cast and transform' })).toBeDisabled();
  },
};

/** A form is picked: what it changes sits beside the character's own numbers. */
export const Previewing: FormPickerStory = {
  args: { picked: 'animal-form:bear', preview: BEAR },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Armor Class')).toBeVisible();
    await expect(canvas.getByText('22 in the form')).toBeVisible();
    await expect(canvas.getByText('yours 19')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cast and transform' })).toBeEnabled();
  },
};

/** A form that changes none of the numbers shown says so. */
export const ChangesNothing: FormPickerStory = {
  args: { picked: 'animal-form:cat', preview: { rows: [] } },
};

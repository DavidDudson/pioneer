import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { DWARF_LANGUAGE_ROWS } from '../testing/languages-fixtures';
import { LanguageAdd } from './language-add.component';

type LanguageAddStory = StoryObj<LanguageAdd>;

const meta: Meta<LanguageAdd> = {
  title: 'Rules/Language add',
  component: LanguageAdd,
};
export default meta;

/** Every language slot filled: nothing to add. */
export const NoneLeft: LanguageAddStory = {
  args: { rows: DWARF_LANGUAGE_ROWS, open: 0, add: async () => undefined },
};

/** A language left to add: Add language shows what the slot offers in place, focused; Escape closes it again. */
export const OneLeft: LanguageAddStory = {
  args: { rows: DWARF_LANGUAGE_ROWS, open: 1, add: async () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('1 language left to add')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Add language' }));
    const picker = canvas.getByRole('combobox', { name: 'Search' });
    await expect(picker).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('button', { name: 'Add language' })).toHaveFocus();
  },
};

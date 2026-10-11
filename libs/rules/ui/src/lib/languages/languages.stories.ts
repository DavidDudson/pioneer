import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { DWARF_LANGUAGES } from '../testing/languages-fixtures';
import { LanguagesView } from './languages.component';

type LanguagesStory = StoryObj<LanguagesView>;

const meta: Meta<LanguagesView> = {
  title: 'Rules/Languages',
  component: LanguagesView,
};
export default meta;

/** While the character's languages load. */
export const Loading: LanguagesStory = {
  args: { lines: undefined },
};

/** No ancestry picked yet. */
export const Empty: LanguagesStory = {
  args: { lines: [] },
};

/** A dwarf: Common and Dwarven from the ancestry, Empyrean from a feat, Goblin picked. */
export const Dwarf: LanguagesStory = {
  args: { lines: DWARF_LANGUAGES, remove: async () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('from Angelkin')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Remove Goblin' })).toBeVisible();
  },
};

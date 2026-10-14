import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Rarity } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { languageRow } from '../testing/slot-picker-fixtures';
import { LanguagePicker } from './language-picker.component';
import type { LanguagePickerRow } from './slot-picker-row';

type LanguagePickerStory = StoryObj<LanguagePicker>;

const LANGUAGES: readonly LanguagePickerRow[] = [
  languageRow({ id: 'common', name: 'Common', known: true }),
  languageRow({ id: 'draconic', name: 'Draconic', rarity: Rarity.Uncommon, script: 'Iokharic' }),
  languageRow({ id: 'aklo', name: 'Aklo', rarity: Rarity.Rare, disabledReason: 'Needs a teacher' }),
];

const meta: Meta<LanguagePicker> = {
  title: 'Rules/Language picker',
  component: LanguagePicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: LANGUAGES, ariaLabel: 'Language', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A language the slot can't offer stays in the table and says why. */
export const DisabledWithReason: LanguagePickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs a teacher')).toHaveLength(1);
  },
};

/** A language already picked is marked. */
export const Picked: LanguagePickerStory = { args: { value: 'draconic' } };

/** A long list, searched and scrolled. */
export const LongList: LanguagePickerStory = {
  args: {
    rows: Array.from({ length: 120 }, (_unused, index) =>
      languageRow({ id: `language-${index}`, name: `Language ${index}` }),
    ),
  },
};

/** The content is still loading. */
export const Loading: LanguagePickerStory = { args: { rows: [], loading: true } };

/** The slot offers no language. */
export const Empty: LanguagePickerStory = { args: { rows: [] } };

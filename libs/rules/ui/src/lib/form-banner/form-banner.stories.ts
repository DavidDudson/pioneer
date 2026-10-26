import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { FormBanner } from './form-banner.component';
import type { FormSummary } from './form-banner.component';

type FormBannerStory = StoryObj<FormBanner>;

const PLANT_FORM: FormSummary = {
  name: 'Plant Form',
  details: [
    { key: 'character.sheet.effects.form', params: { name: 'Arboreal' } },
    { key: 'character.sheet.effects.rank', params: { rank: 6 } },
    { key: 'character.sheet.effects.remaining', params: { count: 600 } },
  ],
};

const meta: Meta<FormBanner> = {
  title: 'Rules/Form banner',
  component: FormBanner,
  args: { form: PLANT_FORM, dismiss: async () => undefined, baseView: false },
};
export default meta;

/** The character is in a form: it is named in words with its form, rank and time left, and can be dismissed. */
export const Morphed: FormBannerStory = {};

/** The base sheet shown for reference: marked as such, and the form is still active. */
export const Unmorphed: FormBannerStory = {
  args: { baseView: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Base sheet, for reference only. The form is still active.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Show base sheet', pressed: true })).toBeVisible();
  },
};

/** The character is in no form: the banner is empty. */
export const NoForm: FormBannerStory = { args: { form: undefined } };

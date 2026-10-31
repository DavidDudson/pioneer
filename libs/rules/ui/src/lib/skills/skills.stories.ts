import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { SKILL_STATISTICS } from '../testing/skill-fixtures';
import { SkillsView } from './skills.component';

type SkillsStory = StoryObj<SkillsView>;

const meta: Meta<SkillsView> = {
  title: 'Rules/Skills',
  component: SkillsView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: placeholder rows. */
export const Loading: SkillsStory = { args: { statistics: undefined } };

/** The standard skills; the Lores are one tab away. */
export const Skills: SkillsStory = { args: { statistics: SKILL_STATISTICS } };

/** The Lores tab chosen: only the character's Lores. */
export const Lores: SkillsStory = {
  args: { statistics: SKILL_STATISTICS },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Lores' }));
    await expect(canvas.getByText('Sailing Lore')).toBeVisible();
    await expect(canvas.queryByText('Athletics')).toBeNull();
  },
};

/** A character with no Lores: the tab says so. */
export const NoLores: SkillsStory = {
  args: { statistics: SKILL_STATISTICS.filter(({ name }) => !name.endsWith('Lore')) },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Lores' }));
    await expect(canvas.getByText('No Lores yet.')).toBeVisible();
  },
};

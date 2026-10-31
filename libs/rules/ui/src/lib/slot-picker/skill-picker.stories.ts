import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Attribute, Proficiency } from '@pioneer/rules/sdk';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { skillRow } from '../testing/slot-picker-fixtures';
import { SkillPicker } from './skill-picker.component';
import type { SkillPickerRow } from './slot-picker-row';

type SkillPickerStory = StoryObj<SkillPicker>;

const SKILLS: readonly SkillPickerRow[] = [
  skillRow({
    id: 'acrobatics',
    name: 'Acrobatics',
    attribute: Attribute.Dexterity,
    rank: Proficiency.Untrained,
    modifier: 1,
  }),
  skillRow({ id: 'arcana', name: 'Arcana' }),
  skillRow({
    id: 'athletics',
    name: 'Athletics',
    attribute: Attribute.Strength,
    rank: Proficiency.Expert,
    modifier: 7,
  }),
  skillRow({
    id: 'stealth',
    name: 'Stealth',
    attribute: Attribute.Dexterity,
    disabledReason: 'The class trains it already',
  }),
];

const meta: Meta<SkillPicker> = {
  title: 'Rules/Skill picker',
  component: SkillPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: SKILLS, ariaLabel: 'Skill', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A skill the slot can't offer stays in the table and says why. */
export const DisabledWithReason: SkillPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('The class trains it already')).toHaveLength(1);
  },
};

/** A skill already picked is marked. */
export const Picked: SkillPickerStory = { args: { value: 'arcana' } };

/** Every skill and Lore of a long list, searched and scrolled. */
export const LongList: SkillPickerStory = {
  args: {
    rows: Array.from({ length: 120 }, (_unused, index) => skillRow({ id: `lore-${index}`, name: `Lore ${index}` })),
  },
};

/** The content is still loading. */
export const Loading: SkillPickerStory = { args: { rows: [], loading: true } };

/** The slot offers no skill. */
export const Empty: SkillPickerStory = { args: { rows: [] } };

/** A slot that takes Lores by name: what is typed in the search box and names no listed skill is added as a Lore. */
export const TypedLore: SkillPickerStory = {
  args: { allowLore: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = await waitFor(() => {
      const input = canvasElement.querySelector('input');
      if (input === null) {
        throw new Error('The search box has not rendered');
      }
      return input;
    });
    await userEvent.type(search, 'Sailing');
    await waitFor(async () => {
      await expect(canvas.getByText('Add the Lore "Sailing"')).toBeVisible();
    });
  },
};

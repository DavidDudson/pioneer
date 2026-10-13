import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { FeatCategory, Rarity } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { ActionKind } from '../picker-cells/picker-cell-messages';
import { PrerequisiteState } from '../picker-cells/prerequisite-list/prerequisite-list.component';
import { featRow, PLAYER_CORE } from '../testing/feat-picker-fixtures';
import type { FeatPickerRow } from './feat-picker-row';
import { FeatPicker } from './feat-picker.component';

type FeatPickerStory = StoryObj<FeatPicker>;

const LONG_LIST = 300;

const FEATS: readonly FeatPickerRow[] = [
  featRow({
    id: 'power-attack',
    name: 'Power Attack',
    category: FeatCategory.Class,
    action: ActionKind.Two,
    traits: ['Fighter', 'Flourish'],
    prerequisites: [{ label: 'Trained in Athletics', state: PrerequisiteState.Met }],
  }),
  featRow({
    id: 'sudden-charge',
    name: 'Sudden Charge',
    category: FeatCategory.Class,
    action: ActionKind.Two,
    traits: ['Fighter', 'Flourish', 'Open'],
    prerequisites: [{ label: 'Strength 16', state: PrerequisiteState.Unmet }],
    disabledReason: 'Prerequisites not met',
  }),
  featRow({
    id: 'reactive-shield',
    name: 'Reactive Shield',
    level: 2,
    category: FeatCategory.Class,
    action: ActionKind.Reaction,
    traits: ['Fighter'],
    sources: PLAYER_CORE,
  }),
  featRow({
    id: 'toughness',
    name: 'Toughness',
    category: FeatCategory.General,
    prerequisites: [{ label: 'Worships a deity of magic', state: PrerequisiteState.Unknown }],
  }),
  featRow({
    id: 'assurance',
    name: 'Assurance',
    category: FeatCategory.Skill,
    rarity: Rarity.Uncommon,
    note: 'Already trained in Religion',
  }),
];

const meta: Meta<FeatPicker> = {
  title: 'Rules/Feat picker',
  component: FeatPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: FEATS, ariaLabel: 'Class feat, level 1', disabled: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** Opens straight to the table. The second feat can't be taken and says why; one prerequisite can't be checked. */
export const DisabledWithReason: FeatPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Prerequisites not met')).toHaveLength(1);
  },
};

/** A feat already picked is marked. */
export const Picked: FeatPickerStory = { args: { value: 'reactive-shield' } };

/** The slot offers no feats. */
export const Empty: FeatPickerStory = { args: { rows: [] } };

/** A few hundred feats: only the rows in view are rendered. */
export const LongList: FeatPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      featRow({ id: `feat-${index}`, name: `Feat ${index + 1}`, level: (index % 20) + 1 }),
    ),
  },
};

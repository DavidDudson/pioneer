import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { CLERIC_SLOTS, DIVINE_FONT_SLOTS } from '../../testing/spellcasting-fixtures';
import { SpellSlotsView } from './spell-slots.component';

type SpellSlotsStory = StoryObj<SpellSlotsView>;

const meta: Meta<SpellSlotsView> = {
  title: 'Rules/Spellcasting/Spell slots',
  component: SpellSlotsView,
};
export default meta;

/** A 7th-level cleric's own slots: five cantrips and slots up to 4th rank. */
export const Own: SpellSlotsStory = {
  args: { title: 'Spell slots', slots: CLERIC_SLOTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Cantrips')).toBeVisible();
    await expect(canvas.getByText('4th rank')).toBeVisible();
  },
};

/** A divine font: slots at one rank, no cantrips. */
export const Pool: SpellSlotsStory = {
  args: { title: 'Divine Font slots', slots: DIVINE_FONT_SLOTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Cantrips')).toBeNull();
  },
};

/** An innate entry with no slots: nothing renders. */
export const Empty: SpellSlotsStory = {
  args: { title: 'Spell slots', slots: { ranks: [] } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('fr-heading')).toBeNull();
  },
};

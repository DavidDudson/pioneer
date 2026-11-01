import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { adjustment, BARBARIAN_DEFENCES, DWARF, ENTRY_NAMES, NO_DEFENCES } from '../../testing/defences-fixtures';
import { DefenceIcons } from './defence-icons.component';

type DefenceIconsStory = StoryObj<DefenceIcons>;

const meta: Meta<DefenceIcons> = {
  title: 'Rules/Defence Icons',
  component: DefenceIcons,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: nothing shows. */
export const Loading: DefenceIconsStory = { args: { defences: undefined } };

/** A character with none: nothing shows. */
export const Empty: DefenceIconsStory = { args: { defences: NO_DEFENCES } };

/** One of each: an icon apiece, in the order resistances, immunities, weaknesses. */
export const Barbarian: DefenceIconsStory = { args: { defences: BARBARIAN_DEFENCES } };

/** Only a resistance: one icon. */
export const ResistanceOnly: DefenceIconsStory = {
  args: { defences: { ...NO_DEFENCES, resistances: [adjustment(DWARF, 'cold', { value: 2 })] } },
};

/** An icon focused: the lines of its kind open. */
export const Opened: DefenceIconsStory = {
  args: { defences: BARBARIAN_DEFENCES },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByRole('button', { name: 'Resistances' }));
    await expect(await within(document.body).findByText('Fire')).toBeVisible();
  },
};

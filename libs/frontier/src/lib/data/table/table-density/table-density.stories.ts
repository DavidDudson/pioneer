import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { TableDensity } from '../../table-view/table-view-store';
import { TableDensityControl } from './table-density.component';

type TableDensityStory = StoryObj<TableDensityControl>;

/** The *Row density* switch of a table: comfortable or compact rows. `fr-table` shows it with `showDensity`. */
const meta: Meta<TableDensityControl> = {
  title: 'Data/Table density',
  component: TableDensityControl,
  args: { value: TableDensity.Comfortable },
};

export default meta;

export const Default: TableDensityStory = {};

export const Compact: TableDensityStory = { args: { value: TableDensity.Compact } };

/** Pressing the other option chooses it. */
export const Choose: TableDensityStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const compact = canvas.getByRole('button', { name: 'Compact' });
    await userEvent.click(compact);
    await expect(compact).toHaveAttribute('aria-pressed', 'true');
  },
};

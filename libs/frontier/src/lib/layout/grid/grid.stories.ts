import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { Surface } from '../surface/surface.component';
import { Grid, GridColumns, GridMinItem } from './grid.component';

type GridStory = StoryObj<Grid>;

const ATTRIBUTES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;

const meta: Meta<Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  decorators: [moduleMetadata({ imports: [Surface, Text] })],
  argTypes: {
    columns: { control: 'inline-radio', options: Object.values(GridColumns) },
    minItem: { control: 'inline-radio', options: [undefined, ...Object.values(GridMinItem)] },
    gap: { control: 'select', options: Object.values(Space) },
  },
  args: { columns: GridColumns.Two, gap: Space.Md },
  render: (args) => ({
    props: { ...args, attributes: ATTRIBUTES },
    template: `
      <fr-grid ${argsToTemplate(args)}>
        @for (attribute of attributes; track attribute) {
          <fr-surface><fr-text>{{ attribute }}</fr-text></fr-surface>
        }
      </fr-grid>
    `,
  }),
};
export default meta;

export const TwoColumns: GridStory = {};

export const ThreeColumns: GridStory = { args: { columns: GridColumns.Three } };

export const FourColumns: GridStory = { args: { columns: GridColumns.Four } };

/** Six-up stat blocks: two columns even when narrow. */
export const SixColumns: GridStory = { args: { columns: GridColumns.Six, gap: Space.Sm } };

/** As many columns as fit at the minimum item width. */
export const Fluid: GridStory = { args: { minItem: GridMinItem.Sm } };

import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Container, Space } from '../../tokens';
import { Surface } from '../surface/surface.component';
import { Grid, GridAlign, GridColumns, GridMinItem, GridQuery } from './grid.component';

type GridStory = StoryObj<Grid>;

const ATTRIBUTES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;

const meta: Meta<Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  decorators: [moduleMetadata({ imports: [Surface, Text] })],
  argTypes: {
    columns: { control: 'inline-radio', options: Object.values(GridColumns) },
    minItem: { control: 'inline-radio', options: [undefined, ...Object.values(GridMinItem)] },
    termFrom: { control: 'inline-radio', options: [undefined, ...Object.values(Container)] },
    align: { control: 'inline-radio', options: Object.values(GridAlign) },
    query: { control: 'inline-radio', options: Object.values(GridQuery) },
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

/** One column when narrow, then a fixed term column and a value column from the `sm` container size. */
export const TermColumns: GridStory = {
  args: { termFrom: Container.Sm, gap: Space.Xs, align: GridAlign.Baseline },
  render: (args) => ({
    props: args,
    template: `
      <fr-grid ${argsToTemplate(args)}>
        <fr-text tone="muted">Perception</fr-text>
        <fr-text>+7</fr-text>
        <fr-text tone="muted">Speed</fr-text>
        <fr-text>25 feet</fr-text>
      </fr-grid>
    `,
  }),
};

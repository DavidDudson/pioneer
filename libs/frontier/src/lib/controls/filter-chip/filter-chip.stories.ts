import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { FilterOperator } from '../filter-bar/filter-bar.types';
import { FilterChip } from './filter-chip.component';

type FilterChipStory = StoryObj<FilterChip>;

/** A filter as `[property][operator][value][x]`, one control-size tall. */
const meta: Meta<FilterChip> = {
  title: 'Controls/Filter Chip',
  component: FilterChip,
  argTypes: {
    segmentPressed: { action: 'segmentPressed' },
    removed: { action: 'removed' },
    dropped: { action: 'dropped' },
  },
  args: { property: 'Rarity', operator: FilterOperator.Is, value: 'Rare', expanded: false, controls: 'rarity-editor' },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-filter-chip ${argsToTemplate(args)} />`,
  }),
};

export default meta;

export const Is: FilterChipStory = {};

export const IsNot: FilterChipStory = { args: { operator: FilterOperator.IsNot } };

export const IsAnyOf: FilterChipStory = { args: { operator: FilterOperator.IsAnyOf, value: 'Rare, Unique' } };

export const Between: FilterChipStory = {
  args: { property: 'Level', operator: FilterOperator.Between, value: '3 to 5' },
};

/** No value yet: it is dropped when focus leaves it with no editor open. */
export const Draft: FilterChipStory = { args: { value: '' } };

/** Its editor is open: every segment announces `aria-expanded` and `aria-controls`. */
export const Expanded: FilterChipStory = { args: { expanded: true } };

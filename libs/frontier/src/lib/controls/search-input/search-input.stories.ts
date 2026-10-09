import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { SearchInput } from './search-input.component';

type SearchInputStory = StoryObj<SearchInput>;

/**
 * A plain control for a search query. `searched` fires once typing goes quiet, and at once on Enter,
 * Escape (which clears) or the clear button.
 */
const meta: Meta<SearchInput> = {
  title: 'Controls/Search Input',
  component: SearchInput,
  argTypes: {
    searched: { action: 'searched' },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { value: '', placeholder: 'Search feats', ariaLabel: 'Search feats', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-search-input ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: SearchInputStory = {};

/** The clear button shows once there is a query. */
export const WithQuery: SearchInputStory = { args: { value: 'Power Attack' } };

export const Invalid: SearchInputStory = { args: { value: 'level:', invalid: true } };

/** No clear button while disabled. */
export const Disabled: SearchInputStory = { args: { value: 'Power Attack', disabled: true } };

import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideDices, LucideSearchX, LucideUsers } from '@lucide/angular';

import { Button } from '../../actions/button/button.component';
import { Surface } from '../../layout/surface/surface.component';
import { EmptyState } from './empty-state.component';

type EmptyStateStory = StoryObj<EmptyState>;

/** What a list or search shows when it has nothing, with an optional action. */
const meta: Meta<EmptyState> = {
  title: 'Feedback/Empty State',
  component: EmptyState,
  decorators: [moduleMetadata({ imports: [Button, Surface] })],
  argTypes: { icon: { control: false } },
  args: {
    icon: LucideDices,
    title: 'No rolls yet',
    description: 'Enter an expression and roll; results show here.',
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    // A Lucide icon is a class, and argsToTemplate drops function args.
    template: `<fr-empty-state [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })} />`,
  }),
};
export default meta;

export const Default: EmptyStateStory = {};

export const TitleOnly: EmptyStateStory = { args: { icon: undefined, title: 'None.', description: undefined } };

export const WithAction: EmptyStateStory = {
  args: { icon: LucideUsers, title: 'No characters yet', description: 'Create one to get started.' },
  render: (args) => ({
    props: args,
    template: `
      <fr-empty-state [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })}>
        <fr-button variant="primary">New character</fr-button>
      </fr-empty-state>
    `,
  }),
};

/** A search with no matches, inside a surface, with a way back. */
export const NoResults: EmptyStateStory = {
  args: { icon: LucideSearchX, title: 'No feats match', description: 'Try fewer filters or a shorter search.' },
  render: (args) => ({
    props: args,
    template: `
      <fr-surface>
        <fr-empty-state [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })}>
          <fr-button>Clear filters</fr-button>
        </fr-empty-state>
      </fr-surface>
    `,
  }),
};

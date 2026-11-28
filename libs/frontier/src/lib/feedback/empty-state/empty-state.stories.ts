import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Dices, SearchX, Users } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { Surface } from '../../layout/surface/surface.component';
import { EmptyStateDescription } from './empty-state-description.component';
import { EmptyStateHeader } from './empty-state-header.component';
import { EmptyStateMedia } from './empty-state-media.component';
import { EmptyStateTitle } from './empty-state-title.component';
import { EmptyState } from './empty-state.component';

type EmptyStateStory = StoryObj<EmptyState>;

/** What a list or search shows when it has nothing, built from media, header, title and description parts, with an optional action. */
const meta: Meta<EmptyState> = {
  title: 'Feedback/Empty State',
  component: EmptyState,
  decorators: [
    moduleMetadata({
      imports: [Button, Surface, EmptyStateDescription, EmptyStateHeader, EmptyStateMedia, EmptyStateTitle],
    }),
  ],
  parameters: { layout: 'padded' },
  render: () => ({
    props: { icon: Dices },
    template: `
      <fr-empty-state>
        <fr-empty-state-media [icon]="icon" />
        <fr-empty-state-header>
          <fr-empty-state-title>No rolls yet</fr-empty-state-title>
          <fr-empty-state-description>Enter an expression and roll; results show here.</fr-empty-state-description>
        </fr-empty-state-header>
      </fr-empty-state>
    `,
  }),
};

export default meta;

export const Default: EmptyStateStory = {};

/** The title may sit directly in the empty state, with no media, header or description. */
export const TitleOnly: EmptyStateStory = {
  render: () => ({
    template: '<fr-empty-state><fr-empty-state-title>None.</fr-empty-state-title></fr-empty-state>',
  }),
};

export const WithAction: EmptyStateStory = {
  render: () => ({
    props: { icon: Users },
    template: `
      <fr-empty-state>
        <fr-empty-state-media [icon]="icon" />
        <fr-empty-state-header>
          <fr-empty-state-title>No characters yet</fr-empty-state-title>
          <fr-empty-state-description>Create one to get started.</fr-empty-state-description>
        </fr-empty-state-header>
        <fr-button variant="primary">New character</fr-button>
      </fr-empty-state>
    `,
  }),
};

/** A search with no matches, inside a surface, with a way back. */
export const NoResults: EmptyStateStory = {
  render: () => ({
    props: { icon: SearchX },
    template: `
      <fr-surface>
        <fr-empty-state>
          <fr-empty-state-media [icon]="icon" />
          <fr-empty-state-header>
            <fr-empty-state-title>No feats match</fr-empty-state-title>
            <fr-empty-state-description>Try fewer filters or a shorter search.</fr-empty-state-description>
          </fr-empty-state-header>
          <fr-button>Clear filters</fr-button>
        </fr-empty-state>
      </fr-surface>
    `,
  }),
};

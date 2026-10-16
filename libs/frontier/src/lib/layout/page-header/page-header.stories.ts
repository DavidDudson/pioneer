import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Button } from '../../actions/button/button.component';
import { Link } from '../../actions/link/link.component';
import { Stack } from '../stack/stack.component';
import { PageHeader } from './page-header.component';

type PageHeaderStory = StoryObj<PageHeader>;

const meta: Meta<PageHeader> = {
  title: 'Layout/Page header',
  component: PageHeader,
  decorators: [moduleMetadata({ imports: [Button, Link, Stack] })],
  args: { title: 'Briar Rose', description: 'Level 5 druid' },
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: PageHeaderStory = {};

/** `title` is `undefined` while the page's subject loads: the heading shows a skeleton. */
export const LoadingTitle: PageHeaderStory = { args: { title: undefined, description: undefined } };

/** Breadcrumbs above the title, actions beside it, tabs below it. */
export const AllSlots: PageHeaderStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-page-header [title]="title" [description]="description">
        <fr-link frPageBreadcrumbs to="/characters">Characters</fr-link>
        <fr-stack frPageActions direction="horizontal" gap="sm">
          <fr-button>Export</fr-button>
          <fr-button variant="primary">Level up</fr-button>
        </fr-stack>
        <fr-stack frPageTabs direction="horizontal" gap="sm">
          <fr-link to="/characters/briar-rose/plan">Plan</fr-link>
          <fr-link to="/characters/briar-rose/encounter">Encounter</fr-link>
        </fr-stack>
      </fr-page-header>
    `,
  }),
};

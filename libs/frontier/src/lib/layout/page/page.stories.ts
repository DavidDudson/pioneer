import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Button } from '../../actions/button/button.component';
import { Text } from '../../text/text/text.component';
import { PageAside } from '../page-aside/page-aside.component';
import { PageBody } from '../page-body/page-body.component';
import { PageHeader } from '../page-header/page-header.component';
import { Stack } from '../stack/stack.component';
import { Surface } from '../surface/surface.component';
import { Page } from './page.component';

interface PageArgs {
  readonly title: string | undefined;
  readonly description: string | undefined;
}
type PageStory = StoryObj<PageArgs>;

const meta: Meta<PageArgs> = {
  title: 'Layout/Page',
  component: Page,
  decorators: [moduleMetadata({ imports: [Button, PageAside, PageBody, PageHeader, Stack, Surface, Text] })],
  args: { title: 'Characters', description: 'Everyone in your party, newest first.' },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-page>
        <fr-page-header [title]="title" [description]="description">
          <fr-stack frPageActions direction="horizontal" gap="sm">
            <fr-button>Import</fr-button>
            <fr-button variant="primary">New character</fr-button>
          </fr-stack>
        </fr-page-header>
        <fr-page-body>
          <fr-surface><fr-text element="p">Page content goes here.</fr-text></fr-surface>
        </fr-page-body>
      </fr-page>
    `,
  }),
};
export default meta;

export const Default: PageStory = {};

export const WithoutDescription: PageStory = { args: { description: undefined } };

/** `title` is `undefined` while the page's subject loads: the heading shows a skeleton. */
export const LoadingTitle: PageStory = { args: { title: undefined, description: undefined } };

/** The aside sits beside the body from the `lg` container size and stacks under it below that. */
export const WithAside: PageStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-page>
        <fr-page-header [title]="title" [description]="description" />
        <fr-page-body>
          <fr-surface><fr-text element="p">Page content goes here.</fr-text></fr-surface>
        </fr-page-body>
        <fr-page-aside label="Party">
          <fr-surface><fr-text element="p">Supporting content goes here.</fr-text></fr-surface>
        </fr-page-aside>
      </fr-page>
    `,
  }),
};

/** `width="full"` drops the page-width cap, for a page that uses all the room the shell gives it. */
export const FullWidth: PageStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-page width="full">
        <fr-page-header [title]="title" [description]="description" />
        <fr-page-body>
          <fr-surface><fr-text element="p">Page content goes here.</fr-text></fr-surface>
        </fr-page-body>
      </fr-page>
    `,
  }),
};

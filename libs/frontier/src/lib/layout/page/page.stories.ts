import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Button } from '../../actions/button/button.component';
import { Text } from '../../text/text/text.component';
import { Stack } from '../stack/stack.component';
import { Surface } from '../surface/surface.component';
import { Page } from './page.component';

type PageStory = StoryObj<Page>;

const meta: Meta<Page> = {
  title: 'Layout/Page',
  component: Page,
  decorators: [moduleMetadata({ imports: [Button, Stack, Surface, Text] })],
  args: { title: 'Characters', description: 'Everyone in your party, newest first.' },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-page [title]="title" [description]="description">
        <fr-stack frPageActions direction="horizontal" gap="sm">
          <fr-button>Import</fr-button>
          <fr-button variant="primary">New character</fr-button>
        </fr-stack>
        <fr-surface><fr-text element="p">Page content goes here.</fr-text></fr-surface>
      </fr-page>
    `,
  }),
};
export default meta;

export const Default: PageStory = {};

export const WithoutDescription: PageStory = { args: { description: undefined } };

/** `title` is `undefined` while the page's subject loads: the heading shows a skeleton. */
export const LoadingTitle: PageStory = { args: { title: undefined, description: undefined } };

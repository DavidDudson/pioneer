import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { PageBody } from '../page-body/page-body.component';
import { Page } from '../page/page.component';
import { Surface } from '../surface/surface.component';
import { PageAside } from './page-aside.component';

type PageAsideStory = StoryObj<PageAside>;

const meta: Meta<PageAside> = {
  title: 'Layout/Page aside',
  component: PageAside,
  decorators: [moduleMetadata({ imports: [Page, PageBody, Surface, Text] })],
  args: { label: 'Party' },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-page>
        <fr-page-body><fr-surface><fr-text element="p">Body content.</fr-text></fr-surface></fr-page-body>
        <fr-page-aside [label]="label"><fr-surface><fr-text element="p">Aside content.</fr-text></fr-surface></fr-page-aside>
      </fr-page>
    `,
  }),
};
export default meta;

/** Beside the body from the `lg` container size; stacked under it when narrower. */
export const Default: PageAsideStory = {};

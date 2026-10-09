import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextVariant } from '../../text/text.variants';
import { Text } from '../../text/text/text.component';
import { Link } from './link.component';

interface LinkStoryArgs extends Link {
  readonly label: string;
}

type LinkStory = StoryObj<LinkStoryArgs>;

const meta: Meta<LinkStoryArgs> = {
  title: 'Actions/Link',
  component: Link,
  decorators: [moduleMetadata({ imports: [Text] })],
  argTypes: {
    to: { control: 'text' },
    variant: { control: 'select', options: [undefined, ...Object.values(TextVariant)] },
  },
  args: { label: 'Valeros', to: '/characters/valeros' },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<fr-link ${argsToTemplate(args)}>${label}</fr-link>`,
  }),
};
export default meta;

/** `to` navigates with the router. */
export const Routed: LinkStory = {};

/** `href` is for external links only. */
export const External: LinkStory = {
  args: { label: 'Archives of Nethys', to: undefined, href: 'https://2e.aonprd.com' },
};

export const Subheading: LinkStory = { args: { variant: TextVariant.Subheading } };

export const InText: LinkStory = {
  render: () => ({
    template: `<fr-text element="p">Content is used under the <fr-link to="/legal">ORC licence</fr-link>.</fr-text>`,
  }),
};

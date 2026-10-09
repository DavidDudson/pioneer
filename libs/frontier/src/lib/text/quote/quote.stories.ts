import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../text/text.component';
import { Quote } from './quote.component';

type QuoteStory = StoryObj<Quote>;

const meta: Meta<Quote> = {
  title: 'Text/Quote',
  component: Quote,
  decorators: [moduleMetadata({ imports: [Text] })],
  args: { attribution: undefined },
  render: (args) => ({
    props: args,
    template: `
      <fr-quote ${argsToTemplate(args)}>
        <fr-text element="p">
          You're gripped by fear and struggle to control your nerves. The frightened condition always includes a
          value. You take a status penalty equal to this value to all your checks and DCs.
        </fr-text>
        <fr-text element="p">At the end of each of your turns, the value decreases by 1.</fr-text>
      </fr-quote>
    `,
  }),
};
export default meta;

export const Passage: QuoteStory = {};

/** Names the source below the quote. */
export const Attributed: QuoteStory = { args: { attribution: 'Player Core, Conditions' } };

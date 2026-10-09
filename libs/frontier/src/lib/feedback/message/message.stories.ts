import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Message, MessageTone } from './message.component';

interface MessageStoryArgs extends Message {
  readonly content: string;
}

type MessageStory = StoryObj<MessageStoryArgs>;

const meta: Meta<MessageStoryArgs> = {
  title: 'Feedback/Message',
  component: Message,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    tone: { control: 'inline-radio', options: Object.values(MessageTone) },
  },
  args: { content: 'Could not save. Try again.', tone: MessageTone.Danger },
  render: ({ content, ...args }) => ({
    props: args,
    template: `<fr-message ${argsToTemplate(args)}>${content}</fr-message>`,
  }),
};
export default meta;

export const Danger: MessageStory = {};

export const Warning: MessageStory = {
  args: { tone: MessageTone.Warning, content: 'Changed elsewhere. Showing the latest version.' },
};

export const Success: MessageStory = { args: { tone: MessageTone.Success, content: 'Saved' } };

export const Info: MessageStory = { args: { tone: MessageTone.Info, content: 'Level up available.' } };

export const Tones: MessageStory = {
  render: () => ({
    props: { tones: Object.values(MessageTone) },
    template: `
      <fr-stack gap="sm">
        @for (tone of tones; track tone) {
          <fr-message [tone]="tone">An inline {{ tone }} message, next to what caused it.</fr-message>
        }
      </fr-stack>
    `,
  }),
};

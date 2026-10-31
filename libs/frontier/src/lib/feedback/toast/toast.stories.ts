import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Toast } from './toast.component';

type ToastStory = StoryObj<Toast>;

const meta: Meta<Toast> = {
  title: 'Feedback/Toast',
  component: Toast,
  decorators: [moduleMetadata({ imports: [Text] })],
  args: { open: true },
  render: (args) => ({
    props: args,
    template: `<fr-toast [open]="open"><fr-text>16</fr-text></fr-toast>`,
  }),
};
export default meta;

/** The roll result pill, bottom centre. */
export const Open: ToastStory = {};

/** Only the empty status region is left in the page. */
export const Closed: ToastStory = { args: { open: false } };

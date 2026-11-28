import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { CircleCheck, Info as InfoIcon, OctagonAlert, TriangleAlert } from 'lucide';

import { Stack } from '../../layout/stack/stack.component';
import { AlertDescription } from './alert-description.component';
import { AlertTitle } from './alert-title.component';
import { Alert, AlertTone } from './alert.component';

interface AlertStoryArgs extends Alert {
  readonly content: string;
}

type AlertStory = StoryObj<AlertStoryArgs>;

const meta: Meta<AlertStoryArgs> = {
  title: 'Feedback/Alert',
  component: Alert,
  decorators: [moduleMetadata({ imports: [Stack, AlertTitle, AlertDescription] })],
  argTypes: {
    tone: { control: 'inline-radio', options: Object.values(AlertTone) },
    icon: { control: false },
  },
  args: { content: 'Could not save. Try again.', tone: AlertTone.Danger },
  render: ({ content, ...args }) => ({
    props: args,
    template: `<fr-alert ${argsToTemplate(args, { exclude: ['icon'] })}>${content}</fr-alert>`,
  }),
};

export default meta;

export const Danger: AlertStory = {};

export const Warning: AlertStory = {
  args: { tone: AlertTone.Warning, content: 'Changed elsewhere. Showing the latest version.' },
};

export const Success: AlertStory = { args: { tone: AlertTone.Success, content: 'Saved' } };

export const Info: AlertStory = { args: { tone: AlertTone.Info, content: 'Level up available.' } };

export const Tones: AlertStory = {
  render: () => ({
    props: { tones: Object.values(AlertTone) },
    template: `
      <fr-stack gap="sm">
        @for (tone of tones; track tone) {
          <fr-alert [tone]="tone">An inline {{ tone }} alert, next to what caused it.</fr-alert>
        }
      </fr-stack>
    `,
  }),
};

/** Icon, title and description make the block form. */
export const WithParts: AlertStory = {
  render: () => ({
    props: { warning: TriangleAlert },
    template: `
      <fr-alert tone="warning" [icon]="warning">
        <fr-alert-title>Changed elsewhere</fr-alert-title>
        <fr-alert-description>Showing the latest version. Your edits are kept until you save.</fr-alert-description>
      </fr-alert>
    `,
  }),
};

/** `dismissible` adds the close button; the caller removes the alert on `dismissed`. */
export const Dismissible: AlertStory = {
  render: () => ({
    props: { info: InfoIcon },
    template: `
      <fr-alert tone="info" [icon]="info" dismissible>
        <fr-alert-title>Level up available</fr-alert-title>
        <fr-alert-description>Open the level plan to choose your new feats.</fr-alert-description>
      </fr-alert>
    `,
  }),
};

export const BlockTones: AlertStory = {
  render: () => ({
    props: { danger: OctagonAlert, success: CircleCheck, warning: TriangleAlert, info: InfoIcon },
    template: `
      <fr-stack gap="md">
        <fr-alert tone="danger" [icon]="danger"><fr-alert-title>Could not save</fr-alert-title></fr-alert>
        <fr-alert tone="warning" [icon]="warning"><fr-alert-title>Changed elsewhere</fr-alert-title></fr-alert>
        <fr-alert tone="success" [icon]="success"><fr-alert-title>Saved</fr-alert-title></fr-alert>
        <fr-alert tone="info" [icon]="info"><fr-alert-title>Level up available</fr-alert-title></fr-alert>
      </fr-stack>
    `,
  }),
};

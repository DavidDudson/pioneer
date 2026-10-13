import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Size } from '../../tokens';
import { ButtonVariant } from '../button/button.component';
import { FileButton } from './file-button.component';

interface FileButtonStoryArgs extends FileButton {
  readonly label: string;
}

type FileButtonStory = StoryObj<FileButtonStoryArgs>;

const meta: Meta<FileButtonStoryArgs> = {
  title: 'Actions/File button',
  component: FileButton,
  argTypes: {
    variant: { control: 'select', options: Object.values(ButtonVariant) },
    size: { control: 'inline-radio', options: Object.values(Size) },
    chosen: { action: 'chosen' },
  },
  args: { label: 'Choose a file', variant: ButtonVariant.Secondary, size: Size.Md, accept: '.json', disabled: false },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<fr-file-button ${argsToTemplate(args)}>${label}</fr-file-button>`,
  }),
};
export default meta;

export const Default: FileButtonStory = {};

export const Disabled: FileButtonStory = { args: { disabled: true } };

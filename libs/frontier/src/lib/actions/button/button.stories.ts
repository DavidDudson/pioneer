import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucidePlus } from '@lucide/angular';

import { Icon } from '../../icon/icon.component';
import { Stack } from '../../layout/stack/stack.component';
import { Size } from '../../tokens';
import { Button, ButtonType, ButtonVariant } from './button.component';

interface ButtonStoryArgs extends Button {
  readonly label: string;
}

type ButtonStory = StoryObj<ButtonStoryArgs>;

const meta: Meta<ButtonStoryArgs> = {
  title: 'Actions/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: Object.values(ButtonVariant) },
    size: { control: 'inline-radio', options: Object.values(Size) },
    type: { control: 'inline-radio', options: Object.values(ButtonType) },
    pressed: { action: 'pressed' },
  },
  args: {
    label: 'Roll initiative',
    variant: ButtonVariant.Secondary,
    size: Size.Md,
    disabled: false,
    busy: false,
  },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<fr-button ${argsToTemplate(args)}>${label}</fr-button>`,
  }),
};
export default meta;

export const Primary: ButtonStory = { args: { variant: ButtonVariant.Primary } };

export const Secondary: ButtonStory = {};

export const Ghost: ButtonStory = { args: { variant: ButtonVariant.Ghost } };

export const Danger: ButtonStory = { args: { variant: ButtonVariant.Danger, label: 'Delete character' } };

export const Inline: ButtonStory = { args: { variant: ButtonVariant.Inline, label: 'Valeros' } };

export const Disabled: ButtonStory = { args: { variant: ButtonVariant.Primary, disabled: true } };

export const Busy: ButtonStory = { args: { variant: ButtonVariant.Primary, busy: true } };

/** The look behind `fr-toggle-button`: filled with the accent when pressed. Features use that component. */
export const ToggleOn: ButtonStory = { args: { variant: ButtonVariant.Toggle, label: 'Flat-footed', toggled: true } };

export const ToggleOff: ButtonStory = { args: { variant: ButtonVariant.Toggle, label: 'Flat-footed', toggled: false } };

export const Sizes: ButtonStory = {
  render: () => ({
    template: `
      <fr-stack direction="horizontal" align="center" gap="sm">
        <fr-button size="sm">Small</fr-button>
        <fr-button size="md">Medium</fr-button>
        <fr-button size="lg">Large</fr-button>
      </fr-stack>
    `,
    moduleMetadata: { imports: [Stack] },
  }),
};

export const WithIcon: ButtonStory = {
  render: () => ({
    props: { plus: LucidePlus },
    template: `<fr-button variant="primary"><fr-icon [icon]="plus" />New character</fr-button>`,
    moduleMetadata: { imports: [Icon] },
  }),
};

export const IconOnly: ButtonStory = {
  render: () => ({
    props: { plus: LucidePlus },
    template: `<fr-button variant="ghost" iconOnly ariaLabel="New character"><fr-icon [icon]="plus" /></fr-button>`,
    moduleMetadata: { imports: [Icon] },
  }),
};

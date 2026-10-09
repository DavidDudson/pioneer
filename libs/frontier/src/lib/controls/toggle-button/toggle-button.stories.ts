import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Size } from '../../tokens';
import { ToggleButton } from './toggle-button.component';

interface ToggleButtonStoryArgs extends ToggleButton {
  readonly label: string;
}

type ToggleButtonStory = StoryObj<ToggleButtonStoryArgs>;

/** The preferred boolean control: outlined when off, filled with the accent when on. */
const meta: Meta<ToggleButtonStoryArgs> = {
  title: 'Controls/Toggle Button',
  component: ToggleButton,
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(Size) },
    committed: { action: 'committed' },
  },
  args: { label: 'Flat-footed', value: false, size: Size.Md, disabled: false },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<fr-toggle-button ${argsToTemplate(args)}>${label}</fr-toggle-button>`,
  }),
};
export default meta;

export const Off: ToggleButtonStory = {};

export const On: ToggleButtonStory = { args: { value: true } };

export const Disabled: ToggleButtonStory = { args: { value: true, disabled: true } };

/** Independent settings side by side, as the dice playground lays them out. */
export const Row: ToggleButtonStory = {
  render: () => ({
    props: { fortune: true, misfortune: false, againstDc: false },
    template: `
      <fr-stack direction="horizontal" gap="sm" wrap>
        <fr-toggle-button [(value)]="fortune">Fortune</fr-toggle-button>
        <fr-toggle-button [(value)]="misfortune">Misfortune</fr-toggle-button>
        <fr-toggle-button [(value)]="againstDc">Against a DC</fr-toggle-button>
      </fr-stack>
    `,
    moduleMetadata: { imports: [Stack] },
  }),
};

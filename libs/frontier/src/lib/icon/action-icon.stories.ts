import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../layout/stack/stack.component';
import { Size } from '../tokens';
import { ActionIcon, ActionIconCost } from './action-icon.component';

type ActionIconStory = StoryObj<ActionIcon>;

/** The symbol for what an action costs, drawn by Pioneer and read out as its label. */
const meta: Meta<ActionIcon> = {
  title: 'Icons/Action icon',
  component: ActionIcon,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    cost: { control: 'select', options: Object.values(ActionIconCost) },
    upTo: { control: 'select', options: [undefined, ActionIconCost.Two, ActionIconCost.Three] },
    size: { control: 'inline-radio', options: Object.values(Size) },
  },
  args: { cost: ActionIconCost.Two, label: 'Two actions', size: Size.Md },
  render: (args) => ({ props: args, template: `<fr-action-icon ${argsToTemplate(args)} />` }),
};
export default meta;

export const Default: ActionIconStory = {};

/** Every cost, and the ranges between them. */
export const AllCosts: ActionIconStory = {
  render: () => ({
    props: {
      size: Size.Md,
      costs: [
        { cost: 'one', label: 'One action' },
        { cost: 'two', label: 'Two actions' },
        { cost: 'three', label: 'Three actions' },
        { cost: 'free', label: 'Free action' },
        { cost: 'reaction', label: 'Reaction' },
        { cost: 'one', upTo: 'two', label: 'One to two actions' },
        { cost: 'one', upTo: 'three', label: 'One to three actions' },
        { cost: 'two', upTo: 'three', label: 'Two to three actions' },
      ],
    },
    template: `
      <fr-stack gap="md">
        @for (item of costs; track item.label) {
          <fr-action-icon [cost]="item.cost" [upTo]="item.upTo" [label]="item.label" [size]="size" />
        }
      </fr-stack>`,
  }),
};

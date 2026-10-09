import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { ListItem } from '../list-item/list-item.component';
import { List } from './list.component';

type ListStory = StoryObj<List>;

const STEPS = ['Choose an ancestry', 'Pick a background', 'Choose a class', 'Assign attribute boosts'] as const;

const meta: Meta<List> = {
  title: 'Lists/List',
  component: List,
  subcomponents: { ListItem },
  decorators: [moduleMetadata({ imports: [ListItem, Text] })],
  argTypes: {
    gap: { control: 'select', options: Object.values(Space) },
  },
  args: { ordered: false, markers: false, gap: Space.Xs },
  render: (args) => ({
    props: { ...args, steps: STEPS },
    template: `
      <fr-list ${argsToTemplate(args)}>
        @for (step of steps; track step) {
          <fr-list-item><fr-text>{{ step }}</fr-text></fr-list-item>
        }
      </fr-list>
    `,
  }),
};
export default meta;

export const Plain: ListStory = {};

export const Bullets: ListStory = { args: { markers: true } };

export const Numbered: ListStory = { args: { ordered: true, markers: true } };

export const Spacious: ListStory = { args: { markers: true, gap: Space.Md } };

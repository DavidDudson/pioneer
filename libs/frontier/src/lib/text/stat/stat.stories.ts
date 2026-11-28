import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Stat } from './stat.component';

type StatStory = StoryObj<Stat>;

/** A figure with its caption above it. */
const meta: Meta<Stat> = {
  title: 'Text/Stat',
  component: Stat,
  args: { label: 'Armor Class' },
  render: (args) => ({
    props: args,
    template: `<fr-stat ${argsToTemplate(args)}>18</fr-stat>`,
  }),
};

export default meta;

export const Default: StatStory = {};

/** A row of stats lines their figures up. */
export const Row: StatStory = {
  render: () => ({
    moduleMetadata: { imports: [Stack, Stat] },
    template: `
      <fr-stack direction="horizontal" gap="xl">
        <fr-stat label="Armor Class">18</fr-stat>
        <fr-stat label="Hit Points">42</fr-stat>
        <fr-stat label="Perception">+11</fr-stat>
      </fr-stack>
    `,
  }),
};

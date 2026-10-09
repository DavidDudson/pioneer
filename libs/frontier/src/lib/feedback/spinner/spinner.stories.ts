import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Size } from '../../tokens';
import { Spinner } from './spinner.component';

type SpinnerStory = StoryObj<Spinner>;

/** In-place action progress only (a button's pending state, an inline save); never for loading content. */
const meta: Meta<Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(Size) },
  },
  args: { size: Size.Sm, label: 'Saving' },
  render: (args) => ({
    props: args,
    template: `<fr-spinner ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Default: SpinnerStory = {};

export const Sizes: SpinnerStory = {
  render: () => ({
    props: { sizes: Object.values(Size) },
    template: `
      <fr-stack direction="horizontal" align="center" gap="md">
        @for (size of sizes; track size) {
          <fr-spinner [size]="size" />
        }
      </fr-stack>
    `,
  }),
};

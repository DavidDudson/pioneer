import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Button } from '../../actions/button/button.component';
import { CardHeader } from './card-header.component';

type CardHeaderStory = StoryObj<CardHeader>;

/** The title row of a card, shown alone: padded from the default token. See `Layout/Card` for it assembled. */
const meta: Meta<CardHeader> = {
  title: 'Layout/Card/Header',
  component: CardHeader,
  decorators: [moduleMetadata({ imports: [Button] })],
  args: { heading: 'Notes', description: 'Visible to the GM' },
  render: (args) => ({
    props: args,
    template: `<fr-card-header ${argsToTemplate(args)}><fr-button variant="ghost">Edit</fr-button></fr-card-header>`,
  }),
};

export default meta;

export const Default: CardHeaderStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: 'Notes' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
  },
};

/** `heading` is `undefined` while the subject loads: the heading shows a skeleton. */
export const Loading: CardHeaderStory = { args: { heading: undefined, description: undefined } };

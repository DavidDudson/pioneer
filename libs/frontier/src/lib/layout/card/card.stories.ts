import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Button } from '../../actions/button/button.component';
import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { Divider } from '../divider/divider.component';
import { SurfaceVariant } from '../surface/surface.component';
import { CardContent } from './card-content.component';
import { CardFooter } from './card-footer.component';
import { Card } from './card.component';

type CardStory = StoryObj<Card>;

/** A titled panel of header, content and footer parts. */
const meta: Meta<Card> = {
  title: 'Layout/Card',
  component: Card,
  decorators: [moduleMetadata({ imports: [Button, CardContent, CardFooter, Divider, Text] })],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(SurfaceVariant) },
    padding: { control: 'select', options: Object.values(Space) },
  },
  args: { heading: 'Valeros', description: 'Human fighter, level 3', padding: Space.Lg },
  render: (args) => ({
    props: args,
    template: `<fr-card ${argsToTemplate(args)}>
      <fr-card-content><fr-text>Longsword +9, shield, chain mail.</fr-text></fr-card-content>
    </fr-card>`,
  }),
};

export default meta;

export const Default: CardStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: 'Valeros' })).toBeVisible();
    await expect(canvas.getByText('Human fighter, level 3')).toBeVisible();
  },
};

/** The header part: `[frCardActions]` sits beside the heading. */
export const HeaderWithActions: CardStory = {
  render: (args) => ({
    props: args,
    template: `<fr-card ${argsToTemplate(args)}>
      <fr-button frCardActions variant="ghost">Edit</fr-button>
      <fr-card-content><fr-text>Longsword +9, shield, chain mail.</fr-text></fr-card-content>
    </fr-card>`,
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Edit' })).toBeVisible();
  },
};

/** The content part: several bodies with an `fr-divider` between them; the rule runs edge to edge. */
export const DividedContent: CardStory = {
  render: (args) => ({
    props: args,
    template: `<fr-card ${argsToTemplate(args)}>
      <fr-card-content><fr-text>Longsword +9</fr-text></fr-card-content>
      <fr-divider />
      <fr-card-content><fr-text>Shield, chain mail</fr-text></fr-card-content>
    </fr-card>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Longsword +9')).toBeVisible();
    await expect(canvas.getByText('Shield, chain mail')).toBeVisible();
  },
};

/** The footer part: the card draws the rule above it, and the footer holds the end row. */
export const WithFooter: CardStory = {
  render: (args) => ({
    props: args,
    template: `<fr-card ${argsToTemplate(args)}>
      <fr-card-content><fr-text>Longsword +9, shield, chain mail.</fr-text></fr-card-content>
      <fr-card-footer><fr-button variant="ghost">Cancel</fr-button><fr-button>Save</fr-button></fr-card-footer>
    </fr-card>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('separator')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
  },
};

/** No heading: a card of content only. */
export const Untitled: CardStory = { args: { heading: undefined, description: undefined } };

/** `loading` shows a skeleton heading while the subject loads. */
export const Loading: CardStory = { args: { heading: undefined, description: undefined, loading: true } };

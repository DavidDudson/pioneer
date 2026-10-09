import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Stack } from '../stack/stack.component';
import { Divider, DividerOrientation, DividerTone } from './divider.component';

type DividerStory = StoryObj<Divider>;

const meta: Meta<Divider> = {
  title: 'Layout/Divider',
  component: Divider,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: Object.values(DividerOrientation),
    },
    tone: { control: 'inline-radio', options: Object.values(DividerTone) },
  },
  args: {
    orientation: DividerOrientation.Horizontal,
    tone: DividerTone.Subtle,
  },
  render: (args) => ({
    props: args,
    template: `
      <fr-stack gap="sm">
        <fr-text element="p">Strength +4, Dexterity +2</fr-text>
        <fr-divider ${argsToTemplate(args)} />
        <fr-text element="p">Perception +12; darkvision</fr-text>
      </fr-stack>
    `,
  }),
};
export default meta;

export const Horizontal: DividerStory = {};

/** Between items in a row. Stretches to the row's height and is decorative. */
export const Vertical: DividerStory = {
  render: () => ({
    template: `
      <fr-stack direction="horizontal" gap="sm" align="center">
        <fr-text>AC 18</fr-text>
        <fr-divider orientation="vertical" />
        <fr-text>HP 32</fr-text>
        <fr-divider orientation="vertical" />
        <fr-text>Speed 25 feet</fr-text>
      </fr-stack>
    `,
  }),
};

/** Every tone. Switch theme and mode in the toolbar to compare. */
export const Tones: DividerStory = {
  render: () => ({
    props: { tones: Object.values(DividerTone) },
    template: `
      <fr-stack gap="md">
        @for (tone of tones; track tone) {
          <fr-stack gap="2xs">
            <fr-text tone="muted">{{ tone }}</fr-text>
            <fr-divider [tone]="tone" />
          </fr-stack>
        }
      </fr-stack>
    `,
  }),
};

import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Text } from '../../text/text/text.component';
import { Section } from './section.component';

type SectionStory = StoryObj<Section>;

/** A sheet section: a region landmark named by its level 2 heading, which a section index can focus. */
const meta: Meta<Section> = {
  title: 'Layout/Section',
  component: Section,
  decorators: [moduleMetadata({ imports: [Text] })],
  parameters: { layout: 'padded' },
  args: { anchor: 'story-identity', heading: 'Identity' },
  render: (args) => ({
    props: args,
    template: `<fr-section [anchor]="anchor" [heading]="heading">
      <fr-text element="p">Valeros, human fighter, level 3.</fr-text>
    </fr-section>`,
  }),
};
export default meta;

export const Default: SectionStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Identity' })).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 2, name: 'Identity' })).toHaveAttribute('tabindex', '-1');
  },
};

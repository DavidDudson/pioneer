import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Stack } from '../stack/stack.component';
import { Disclosure, DisclosureVariant } from './disclosure.component';

type DisclosureStory = StoryObj<Disclosure>;

/** Secondary content expanded in place under its trigger, instead of a modal. */
const meta: Meta<Disclosure> = {
  title: 'Layout/Disclosure',
  component: Disclosure,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(DisclosureVariant) },
    openChange: { action: 'openChange' },
  },
  args: { open: false, variant: DisclosureVariant.Plain },
  render: (args) => ({
    props: args,
    template: `
      <fr-disclosure ${argsToTemplate(args)}>
        <fr-text frDisclosureSummary>Armor Class 18</fr-text>
        <fr-stack gap="2xs">
          <fr-text tone="muted">10 base</fr-text>
          <fr-text tone="muted">+3 Dexterity</fr-text>
          <fr-text tone="muted">+5 trained proficiency</fr-text>
        </fr-stack>
      </fr-disclosure>
    `,
  }),
};
export default meta;

export const Closed: DisclosureStory = {};

export const Open: DisclosureStory = { args: { open: true } };

export const Bordered: DisclosureStory = { args: { open: true, variant: DisclosureVariant.Bordered } };

/** A breakdown line that has its own breakdown. */
export const Nested: DisclosureStory = {
  render: () => ({
    template: `
      <fr-disclosure variant="bordered" [open]="true">
        <fr-text frDisclosureSummary>Perception +7</fr-text>
        <fr-stack gap="xs">
          <fr-text tone="muted">+2 Wisdom</fr-text>
          <fr-disclosure>
            <fr-text frDisclosureSummary>+5 expert proficiency</fr-text>
            <fr-text tone="muted">Level 1 + expert 4, from Fighter level 1</fr-text>
          </fr-disclosure>
        </fr-stack>
      </fr-disclosure>
    `,
  }),
};

/** Rows of a sheet section, one disclosure per statistic. */
export const List: DisclosureStory = {
  render: () => ({
    template: `
      <fr-stack gap="none">
        <fr-disclosure>
          <fr-text frDisclosureSummary>Fortitude +9</fr-text>
          <fr-text tone="muted">+3 Constitution, +6 expert proficiency</fr-text>
        </fr-disclosure>
        <fr-disclosure>
          <fr-text frDisclosureSummary>Reflex +7</fr-text>
          <fr-text tone="muted">+3 Dexterity, +4 trained proficiency</fr-text>
        </fr-disclosure>
        <fr-disclosure>
          <fr-text frDisclosureSummary>Will +5</fr-text>
          <fr-text tone="muted">+1 Wisdom, +4 trained proficiency</fr-text>
        </fr-disclosure>
      </fr-stack>
    `,
  }),
};

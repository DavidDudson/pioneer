import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextField } from '../text-field/text-field.component';
import { FieldGroup } from './field-group.component';

type FieldGroupStory = StoryObj<FieldGroup>;

/** Fields in a form: the group owns the gap between them. */
const meta: Meta<FieldGroup> = {
  title: 'Forms/Field Group',
  component: FieldGroup,
  decorators: [moduleMetadata({ imports: [TextField] })],
  render: () => ({
    template: `
      <fr-field-group>
        <fr-text-field label="Name" />
        <fr-text-field label="Ancestry" />
        <fr-text-field label="Class" />
      </fr-field-group>
    `,
  }),
};

export default meta;

export const Default: FieldGroupStory = {};

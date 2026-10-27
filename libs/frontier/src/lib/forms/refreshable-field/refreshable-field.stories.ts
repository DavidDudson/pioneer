import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { RefreshableField } from './refreshable-field.component';

type RefreshableFieldStory = StoryObj<RefreshableField>;

const NAMES = ['Seelah', 'Amiri', 'Kyra', 'Merisiel'];
const LOAD_MS = 600;

/** A load that answers with a random name after a moment. */
async function loadName(): Promise<string> {
  const answer = Promise.withResolvers<string>();
  setTimeout(() => {
    answer.resolve(NAMES[Math.floor(Math.random() * NAMES.length)] ?? '');
  }, LOAD_MS);
  return answer.promise;
}

/** A labelled field whose value is fetched, with a refresh button at its end. Bind it with `[formField]`. */
const meta: Meta<RefreshableField> = {
  title: 'Forms/Refreshable Field',
  component: RefreshableField,
  argTypes: { errors: { control: false } },
  args: { label: 'Name', placeholder: 'Name', disabled: false, hideLabel: false, load: loadName },
};
export default meta;

export const Default: RefreshableFieldStory = {};

export const WithHint: RefreshableFieldStory = { args: { hint: 'Rolled for you; type to change it.' } };

export const WithError: RefreshableFieldStory = { args: { error: 'Name is required.' } };

export const Disabled: RefreshableFieldStory = { args: { disabled: true } };

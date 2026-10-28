import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { RefreshableInput } from './refreshable-input.component';

type RefreshableInputStory = StoryObj<RefreshableInput>;

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

/**
 * A text control whose value is fetched. It loads when it appears; the refresh button at the end loads again, and
 * its icon is a spinner while a load is in flight. The value can still be edited by hand.
 */
const meta: Meta<RefreshableInput> = {
  title: 'Controls/Refreshable Input',
  component: RefreshableInput,
  args: { ariaLabel: 'Name', placeholder: 'Name', disabled: false, invalid: false, load: loadName },
};
export default meta;

export const Default: RefreshableInputStory = {};

export const Disabled: RefreshableInputStory = { args: { disabled: true } };

/** A load that never finishes keeps the spinner up. */
export const Loading: RefreshableInputStory = {
  args: { load: async (): Promise<string> => Promise.withResolvers<string>().promise },
};

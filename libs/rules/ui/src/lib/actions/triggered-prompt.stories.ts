import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ActionStatus } from '@pioneer/rules/engine';

import { SHIELD_RAISED_ACTIONS } from '../testing/action-fixtures';
import type { ActionLine } from './action-line';
import { ActionUser } from './action-user';
import { TriggeredPrompt } from './triggered-prompt.component';

type PromptStory = StoryObj<TriggeredPrompt>;

const meta: Meta<TriggeredPrompt> = {
  title: 'Rules/Triggered prompt',
  component: TriggeredPrompt,
  decorators: [
    applicationConfig({
      providers: [{ provide: ActionUser, useValue: { use: async (): Promise<void> => undefined } }],
    }),
  ],
};

export default meta;

/** One ability offered. */
export const One: PromptStory = {
  args: { lines: SHIELD_RAISED_ACTIONS.slice(1) },
};

/** Several abilities of one event in one prompt. */
export const Several: PromptStory = {
  args: { lines: SHIELD_RAISED_ACTIONS },
};

const SPENT = SHIELD_RAISED_ACTIONS.slice(1).flatMap((line): ActionLine[] => [
  { ...line, status: ActionStatus.Unavailable, affordable: false },
]);

/** A reaction already spent this round: shown, with no way to use it. */
export const SpentReaction: PromptStory = {
  args: { lines: SPENT },
};

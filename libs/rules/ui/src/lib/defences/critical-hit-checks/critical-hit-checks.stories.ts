import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { criticalHitCheck, FORTIFIED_ARMOR, FORTIFIED_DEFENCES, WHILE_RAGING } from '../../testing/defences-fixtures';
import { CriticalHitChecks } from './critical-hit-checks.component';

type CriticalHitChecksStory = StoryObj<CriticalHitChecks>;

const GREATER_DC = 14;

const meta: Meta<CriticalHitChecks> = {
  title: 'Rules/Critical Hit Checks',
  component: CriticalHitChecks,
};
export default meta;

/** Fortification armour: the check worded from its DC, with a button to roll it. */
export const Fortification: CriticalHitChecksStory = {
  args: { checks: FORTIFIED_DEFENCES.criticalHitChecks },
};

/** Two sources: each keeps its own DC, and a conditional one still shows. */
export const TwoChecks: CriticalHitChecksStory = {
  args: {
    checks: [...FORTIFIED_DEFENCES.criticalHitChecks, criticalHitCheck(FORTIFIED_ARMOR, GREATER_DC, WHILE_RAGING)],
  },
};

/** Pressing the button asks for the roll at the check's DC. */
export const Rolling: CriticalHitChecksStory = {
  args: { checks: FORTIFIED_DEFENCES.criticalHitChecks },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /DC 17/u });
    await userEvent.click(button);
    await expect(button).toBeVisible();
  },
};

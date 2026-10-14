import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { StatisticRoller } from '../statistics/statistic-roller';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import {
  claimableStrike,
  ELEMENT_STRIKE,
  FAILED_STRIKE,
  FIGHTER_STRIKES,
  NO_DAMAGE_STRIKE,
  STEEL_SHIELD,
  THROWN_STRIKES,
} from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';

type StrikesStory = StoryObj<StrikesView>;

const meta: Meta<StrikesView> = {
  title: 'Rules/Strikes',
  component: StrikesView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: placeholder rows. */
export const Loading: StrikesStory = {
  args: { strikes: undefined },
};

/** No Strikes: the list says so. */
export const Empty: StrikesStory = {
  args: { strikes: [] },
};

/** A longsword and an agile dagger with a striking rune: each Strike shows its damage and multiple attack penalty. */
export const Fighter: StrikesStory = {
  args: { strikes: FIGHTER_STRIKES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('1d8+4 slashing')).toBeVisible();
    await expect(canvas.getByText('Multiple attack penalty -4 / -8')).toBeVisible();
    await expect(canvas.getByText('Attack +9 / +5 / +1')).toBeVisible();
  },
};

/** The longsword opened: its attack roll and the damage bonus break down under its summary. */
export const Expanded: StrikesStory = {
  args: { strikes: FIGHTER_STRIKES },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Longsword'));
    const [damageBonus] = canvas.getAllByText('Damage bonus');
    await expect(damageBonus).toBeVisible();
  },
};

/** A Strike whose attack the engine could not derive, marked failed with why. */
export const Failed: StrikesStory = {
  args: { strikes: FAILED_STRIKE },
};

/** A weapon with no dice and no die does no damage. */
export const NoDamage: StrikesStory = {
  args: { strikes: NO_DAMAGE_STRIKE },
};

/** A stack of alchemist's fire and a holy water: range increment, persistent and splash damage, stack size. */
export const Thrown: StrikesStory = {
  args: { strikes: THROWN_STRIKES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('1 persistent fire')).toBeVisible();
    await expect(canvas.getByText('3 in stack')).toBeVisible();
  },
};

/** A held shield: its Hardness, Hit Points and Broken Threshold sit with the Strikes. */
export const WithShield: StrikesStory = {
  args: { strikes: FIGHTER_STRIKES, shields: [STEEL_SHIELD] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Steel Shield: Hardness 5, HP 20, Broken Threshold 10')).toBeVisible();
  },
};

/** A roller that rolls and claims nothing, so the rows show their roll button and situation toggles. */
const CLAIMING_ROLLER: StatisticRoller = { roll: () => undefined, claim: () => undefined };

/** The longsword's attack offers Gloom Walker's situation as a toggle; the roll button sits beside the attack. */
export const ClaimableSituation: StrikesStory = {
  args: { strikes: claimableStrike(false) },
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: CLAIMING_ROLLER }] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /when you are in darkness/u });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByText('Attack +9 / +4 / -1')).toBeVisible();
  },
};

/** The situation claimed: the toggle is pressed, and the attack and its penalty steps count the line. */
export const ClaimedSituation: StrikesStory = {
  args: { strikes: claimableStrike(true) },
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: CLAIMING_ROLLER }] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /when you are in darkness/u });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText('Attack +10 / +5 / +0')).toBeVisible();
  },
};

/** A longsword whose rule elements add a precision die and a critical-only die, and put notes on its rolls. */
export const RuleElements: StrikesStory = {
  args: { strikes: ELEMENT_STRIKE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Plus 1d6 fire precision')).toBeVisible();
    await expect(canvas.getByText('Plus 1d6 cold on a critical hit')).toBeVisible();
    await expect(canvas.getByText('On a critical success, a success')).toBeVisible();
    await expect(canvas.getByText('The flame lingers.')).toBeVisible();
  },
};

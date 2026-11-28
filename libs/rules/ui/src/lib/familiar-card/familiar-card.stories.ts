import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Trait } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { FamiliarCardMovement, FamiliarCardSense, FamiliarCardStatus } from './familiar-card';
import type { FamiliarCardView } from './familiar-card';
import { FamiliarCard } from './familiar-card.component';

type FamiliarCardStory = StoryObj<FamiliarCard>;

const PIP: FamiliarCardView = {
  name: 'Pip',
  species: 'Raven',
  status: FamiliarCardStatus.Active,
  hitPoints: { current: 25, max: 25, temp: 0 },
  armorClass: 24,
  saves: { fortitude: 12, reflex: 10, will: 14 },
  perception: 9,
  skills: [
    { name: 'Acrobatics', modifier: 9 },
    { name: 'Stealth', modifier: 9 },
  ],
  speeds: [
    { movement: FamiliarCardMovement.Land, feet: 25 },
    { movement: FamiliarCardMovement.Fly, feet: 25 },
  ],
  senses: [FamiliarCardSense.LowLightVision, FamiliarCardSense.Scent],
  traits: [Trait.parse('minion'), Trait.parse('tiny')],
};

const meta: Meta<FamiliarCard> = {
  title: 'Rules/Familiar card',
  component: FamiliarCard,
  args: { familiar: PIP },
};

export default meta;

/** An unhurt familiar: every row, with its status in words. */
export const Full: FamiliarCardStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Pip' })).toBeVisible();
    await expect(canvas.getByText('Active')).toBeVisible();
  },
};

/** A hurt familiar with temporary Hit Points. */
export const Injured: FamiliarCardStory = {
  args: { familiar: { ...PIP, hitPoints: { current: 8, max: 25, temp: 5 } } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('5 temporary Hit Points')).toBeVisible();
  },
};

/** A dead familiar: "Dead" in text, numbers kept. */
export const Dead: FamiliarCardStory = {
  args: { familiar: { ...PIP, status: FamiliarCardStatus.Dead, hitPoints: { current: 0, max: 25, temp: 0 } } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Dead')).toBeVisible();
  },
};

/** An absent familiar: named as absent, numbers kept. */
export const Absent: FamiliarCardStory = {
  args: { familiar: { ...PIP, status: FamiliarCardStatus.Absent } },
};

/** An absorbed familiar: name and status only, no numbers. */
export const Absorbed: FamiliarCardStory = {
  args: { familiar: { ...PIP, status: FamiliarCardStatus.Absorbed } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Absorbed')).toBeVisible();
    await expect(canvas.queryByText('Fortitude')).toBeNull();
  },
};

import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { HeadingLevel } from '@pioneer/frontier';
import { expect, within } from 'storybook/test';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import { HELD_TRAIT_PREVIEWS } from '../trait-chip/trait-chip.fixtures';
import { StatBlockLayout } from './creature-stat-block';
import { CreatureStatBlockView } from './creature-stat-block.component';
import { GIANT_RAT, GOBLIN_WARCHANTER } from './creature-stat-block.fixtures';

type CreatureStatBlockStory = StoryObj<CreatureStatBlockView>;

const meta: Meta<CreatureStatBlockView> = {
  title: 'Rules/Creature stat block',
  component: CreatureStatBlockView,
  args: { creature: GOBLIN_WARCHANTER, layout: StatBlockLayout.Full },
};
export default meta;

/** The page tier: every part of the stat block, under a level-two heading. */
export const Page: CreatureStatBlockStory = {
  args: { headingLevel: HeadingLevel.Two },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Goblin Warchanter')).toBeVisible();
    await expect(canvas.getByText('Goblin Scuttle')).toBeVisible();
  },
};

/** The panel tier: the same stat block beside the list, one heading level down. */
export const Panel: CreatureStatBlockStory = {
  args: { headingLevel: HeadingLevel.Three },
};

/** The preview tier: the numbers and Strikes a glance needs. */
export const Preview: CreatureStatBlockStory = {
  args: { layout: StatBlockLayout.Preview },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Goblin Scuttle')).toBeNull();
  },
};

/** A creature with only the core numbers: nothing beyond them shows. */
export const CoreNumbersOnly: CreatureStatBlockStory = {
  args: { creature: GIANT_RAT },
};

/** The traits in the header and on abilities are chips that open the trait's card; the size is no trait. */
export const TraitCards: CreatureStatBlockStory = {
  decorators: [applicationConfig({ providers: [provideEntryPreviews(HELD_TRAIT_PREVIEWS)] })],
};

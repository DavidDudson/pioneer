import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { BadgeTone } from '@pioneer/frontier';

import { ChipList } from './chip-list.component';

type ChipListStory = StoryObj<ChipList>;

const meta: Meta<ChipList> = { title: 'Rules/Picker cells/Chip list', component: ChipList };
export default meta;

/** Traits, the unusual ones toned by rarity. */
export const Traits: ChipListStory = {
  args: {
    chips: [
      { label: 'Fire' },
      { label: 'Evocation' },
      { label: 'Uncommon', tone: BadgeTone.Warning },
      { label: 'Rare', tone: BadgeTone.Info },
    ],
  },
};

/** Traditions. */
export const Traditions: ChipListStory = { args: { chips: [{ label: 'Arcane' }, { label: 'Primal' }] } };

/** More chips than fit a row wrap onto the next. */
export const Wrapping: ChipListStory = {
  args: {
    chips: [...Array.from({ length: 14 }).keys()].map((index) => ({ label: `Trait ${String(index + 1)}` })),
  },
};

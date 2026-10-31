import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { NaturalBurst, NaturalBurstKind } from './natural-burst.component';

type NaturalBurstStory = StoryObj<NaturalBurst>;

const meta: Meta<NaturalBurst> = {
  title: 'Feedback/Natural burst',
  component: NaturalBurst,
  args: { kind: NaturalBurstKind.High },
};
export default meta;

/** A natural 20: a gold wash and frame that fade. */
export const High: NaturalBurstStory = {};

/** A natural 1: a red wash and frame that fade while they shake. */
export const Low: NaturalBurstStory = { args: { kind: NaturalBurstKind.Low } };

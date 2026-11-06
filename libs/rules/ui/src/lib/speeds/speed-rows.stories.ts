import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { FLYER_SPEEDS, WALKER_SPEEDS } from '../testing/speed-fixtures';
import { SpeedRows } from './speed-rows.component';

type SpeedRowsStory = StoryObj<SpeedRows>;

const meta: Meta<SpeedRows> = {
  title: 'Rules/Speed Rows',
  component: SpeedRows,
};
export default meta;

/** While the engine's inputs load: a placeholder per row. */
export const Loading: SpeedRowsStory = {
  args: { speeds: undefined },
};

/** No Speed of any kind: every row reads None. */
export const Empty: SpeedRowsStory = {
  args: { speeds: [] },
};

/** Most characters: a land Speed, hovering it opens its breakdown. */
export const Walker: SpeedRowsStory = {
  args: { speeds: WALKER_SPEEDS },
};

/** A character that also flies. */
export const Flyer: SpeedRowsStory = {
  args: { speeds: FLYER_SPEEDS },
};

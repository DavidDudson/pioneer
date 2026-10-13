import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { LevelCell } from './level-cell.component';

type LevelStory = StoryObj<LevelCell>;

const meta: Meta<LevelCell> = { title: 'Rules/Picker cells/Level', component: LevelCell, args: { level: 3 } };
export default meta;

/** A level 3 entry. */
export const Level: LevelStory = {};

/** A level 20 entry. */
export const TopLevel: LevelStory = { args: { level: 20 } };

import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextCell } from './text-cell.component';

type TextStory = StoryObj<TextCell>;

const meta: Meta<TextCell> = { title: 'Rules/Picker cells/Text', component: TextCell, args: { text: '12' } };
export default meta;

/** A number as the locale writes it. */
export const Number: TextStory = {};

/** A cell with nothing to show is empty. */
export const Empty: TextStory = { args: { text: '' } };
